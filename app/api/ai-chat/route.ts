import { openai } from '@ai-sdk/openai';
import {
    convertToModelMessages,
    createIdGenerator,
    stepCountIs,
    streamText,
    TypeValidationError,
    type UIMessage,
    validateUIMessages,
} from 'ai';
import { ObjectId } from 'mongodb';
import { maybeAssignSessionTitle } from '@/agent/fastPath';
import { shouldEnableWebSearch } from '@/agent/helpers';
import { DECK_ASSISTANT_INSTRUCTIONS } from '@/agent/instructions';
import { getOwnedSession, loadUIMessageHistory, replaceUIMessageHistory } from '@/agent/store';
import { createAgentTools } from '@/agent/tools';
import { verifyAuthToken } from '@/lib/auth';

interface ChatRequestBody {
    id?: string;
    messages?: UIMessage[];
    message?: UIMessage;
    token?: string;
    pageUrl?: string;
}

function mergeIncomingMessage(history: UIMessage[], message: UIMessage) {
    const index = history.findIndex((item) => item.id === message.id);
    if (index === -1) {
        return [...history, message];
    }

    return history.map((item, itemIndex) => (itemIndex === index ? message : item));
}

function getMessageText(message: UIMessage | undefined) {
    if (!message) {
        return '';
    }

    return message.parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('\n')
        .trim();
}

function getLatestUserText(messages: UIMessage[]) {
    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');
    return getMessageText(latestUserMessage);
}

function getSystemPrompt(pageUrl?: string) {
    const promptParts = [DECK_ASSISTANT_INSTRUCTIONS];

    if (pageUrl) {
        promptParts.push(`Context: The user is currently viewing this page: ${pageUrl}`);
    }

    return promptParts.join('\n\n');
}

function getFallbackMessages(messages: UIMessage[]) {
    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');
    return latestUserMessage ? [latestUserMessage] : [];
}

function logReplayError(stage: string, sessionId: string, userId: string, error: unknown) {
    console.warn('[ai-chat] replay fallback triggered', {
        stage,
        sessionId,
        userId,
        error: error instanceof Error ? error.message : String(error),
    });
}

export async function POST(request: Request) {
    const body = await request.json() as ChatRequestBody;
    const { id: sessionId, messages, message, token, pageUrl } = body;

    const user = verifyAuthToken(token);
    if (!user) {
        return new Response('Unauthorized', { status: 401 });
    }

    if (!sessionId || !ObjectId.isValid(sessionId)) {
        return new Response('Invalid session id', { status: 400 });
    }

    const incomingMessages = Array.isArray(messages) && messages.length > 0
        ? messages
        : message
            ? [message]
            : [];

    if (incomingMessages.length === 0) {
        return new Response('Messages are required', { status: 400 });
    }

    const session = await getOwnedSession(sessionId, user.user);
    if (!session) {
        return new Response('Session not found', { status: 404 });
    }

    const previousMessages = await loadUIMessageHistory(sessionId);
    const mergedMessages = incomingMessages.length > 0
        ? incomingMessages
        : message
            ? mergeIncomingMessage(previousMessages, message)
            : previousMessages;
    const latestUserText = getLatestUserText(mergedMessages);
    const shouldPreferWebSearch = shouldEnableWebSearch(latestUserText);
    const latestIncomingMessage = incomingMessages[incomingMessages.length - 1];

    if (latestIncomingMessage?.role === 'user' && latestUserText) {
        await maybeAssignSessionTitle(sessionId, session.title, latestUserText);
    }

    const tools = createAgentTools({
        token,
    });

    let replayMessages = mergedMessages;

    try {
        replayMessages = await validateUIMessages({
            messages: mergedMessages,
            tools: tools as never,
        });
    } catch (error) {
        if (!(error instanceof TypeValidationError)) {
            throw error;
        }

        logReplayError('validateUIMessages', sessionId, user.user, error);
        replayMessages = getFallbackMessages(mergedMessages);
    }

    let modelMessages;

    try {
        modelMessages = await convertToModelMessages(replayMessages);
    } catch (error) {
        logReplayError('convertToModelMessages', sessionId, user.user, error);
        replayMessages = getFallbackMessages(mergedMessages);
        modelMessages = await convertToModelMessages(replayMessages);
    }

    const result = streamText({
        model: openai('gpt-5-mini'),
        system: shouldPreferWebSearch
            ? `${getSystemPrompt(pageUrl)}\n\nUse web search when current or source-backed information would help answer this request.`
            : getSystemPrompt(pageUrl),
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(8),
        providerOptions: {
            openai: {
                parallelToolCalls: false,
            },
        },
    });

    result.consumeStream();

    return result.toUIMessageStreamResponse({
        originalMessages: replayMessages,
        generateMessageId: createIdGenerator({
            prefix: 'msg',
            size: 16,
        }),
        onFinish: async ({ messages }) => {
            await replaceUIMessageHistory(sessionId, messages);
        },
    });
}
