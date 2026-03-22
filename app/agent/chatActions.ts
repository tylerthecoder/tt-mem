'use server';

import { Agent, run, assistant as assistantItem, system as systemItem, user as userItem } from '@openai/agents';
import { ObjectId } from 'mongodb';
import { executeApprovedToolCall } from '@/agent/approval';
import { DEFAULT_SESSION_TITLE, SESSIONS_COLLECTION, TOOL_CALLS_COLLECTION } from '@/agent/constants';
import { maybeAssignSessionTitle, maybeHandleFastPath } from '@/agent/fastPath';
import { DECK_ASSISTANT_INSTRUCTIONS } from '@/agent/instructions';
import { shouldEnableWebSearch } from '@/agent/helpers';
import { createAgentTools } from '@/agent/tools';
import type { PendingToolCallSummary } from '@/agent/types';
import { connectToDatabase } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';
import {
    getOwnedSession,
    listPendingToolCalls,
    loadMessageHistory,
    mapMessage,
    mapSession,
    persistMessage,
} from '@/agent/store';
import type { AIChatMessage, AIChatSession, AIChatSessionDocument } from '@/types';

export async function createAIChatSessionAction(token: string | undefined): Promise<{ success: boolean; session?: AIChatSession; message?: string }> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };

    const { db } = await connectToDatabase();
    const sessions = db.collection<AIChatSessionDocument>(SESSIONS_COLLECTION);
    const now = new Date();
    const res = await sessions.insertOne({
        user_id: user.user,
        title: DEFAULT_SESSION_TITLE,
        createdAt: now,
        updatedAt: now,
    });

    const created = await sessions.findOne({ _id: res.insertedId });
    const mapped = mapSession(created);
    if (!mapped) return { success: false, message: 'Failed to create session' };
    return { success: true, session: mapped };
}

export async function getAIChatMessagesAction(sessionId: string, token: string | undefined): Promise<{ success: boolean; messages?: AIChatMessage[]; message?: string }> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };
    if (!sessionId || !ObjectId.isValid(sessionId)) return { success: false, message: 'Invalid session id' };

    const sessionDoc = await getOwnedSession(sessionId, user.user);
    if (!sessionDoc) return { success: false, message: 'Session not found' };

    const docs = await loadMessageHistory(sessionId);
    const mapped = docs.map(mapMessage).filter((message): message is AIChatMessage => message !== null);
    return { success: true, messages: mapped };
}

export async function listAIChatSessionsAction(token: string | undefined): Promise<{ success: boolean; sessions?: AIChatSession[]; message?: string }> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };

    const { db } = await connectToDatabase();
    const sessions = db.collection<AIChatSessionDocument>(SESSIONS_COLLECTION);
    const docs = await sessions.find({ user_id: user.user }).sort({ updatedAt: -1 }).toArray();
    const mapped = docs.map(mapSession).filter((session): session is AIChatSession => session !== null);
    return { success: true, sessions: mapped };
}

export async function getPendingToolCallsAction(sessionId: string, token: string | undefined): Promise<{ success: boolean; toolCalls?: PendingToolCallSummary[]; message?: string }> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };
    if (!sessionId || !ObjectId.isValid(sessionId)) return { success: false, message: 'Invalid session id' };

    const sessionDoc = await getOwnedSession(sessionId, user.user);
    if (!sessionDoc) return { success: false, message: 'Session not found' };

    const toolCalls = await listPendingToolCalls(sessionId);
    return { success: true, toolCalls };
}

export async function approveToolCallAction(sessionId: string, toolCallId: string, approve: boolean, token: string | undefined): Promise<{ success: boolean; message?: string }> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };
    if (!sessionId || !ObjectId.isValid(sessionId) || !toolCallId || !ObjectId.isValid(toolCallId)) {
        return { success: false, message: 'Invalid ids' };
    }

    const sessionDoc = await getOwnedSession(sessionId, user.user);
    if (!sessionDoc) return { success: false, message: 'Session not found' };

    const { db } = await connectToDatabase();
    const toolCalls = db.collection<any>(TOOL_CALLS_COLLECTION);
    const call = await toolCalls.findOne({ _id: new ObjectId(toolCallId), session_id: new ObjectId(sessionId) });
    if (!call) return { success: false, message: 'Tool call not found' };

    if (!approve) {
        await toolCalls.updateOne(
            { _id: call._id },
            { $set: { approved: false, executedAt: new Date(), error: 'Rejected by user' } }
        );
        await persistMessage(sessionId, 'system', `Rejected tool: ${call.name}`);
        return { success: true };
    }

    try {
        const result = await executeApprovedToolCall(call.name, call.arguments, token);
        await toolCalls.updateOne(
            { _id: call._id },
            { $set: { approved: true, executedAt: new Date(), result } }
        );
        await persistMessage(sessionId, 'tool', JSON.stringify({ tool: call.name, result }));
        return { success: true };
    } catch (error: any) {
        const message = error?.message || 'Unknown error';
        await toolCalls.updateOne(
            { _id: call._id },
            { $set: { approved: true, executedAt: new Date(), error: message } }
        );
        await persistMessage(sessionId, 'tool', JSON.stringify({ tool: call.name, error: message }));
        return { success: false, message };
    }
}

export async function sendAIChatMessageAction(
    sessionId: string,
    userText: string,
    token: string | undefined,
    pageUrl?: string
): Promise<{ success: boolean; assistantText?: string; pendingToolCalls?: { id: string; name: string; arguments: unknown }[]; message?: string }> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };
    if (!sessionId || !ObjectId.isValid(sessionId)) return { success: false, message: 'Invalid session id' };
    if (!userText || !userText.trim()) return { success: false, message: 'Message cannot be empty' };

    const sessionDoc = await getOwnedSession(sessionId, user.user);
    if (!sessionDoc) return { success: false, message: 'Session not found' };

    const trimmedText = userText.trim();
    const userMessageId = await persistMessage(sessionId, 'user', trimmedText);
    await maybeAssignSessionTitle(sessionId, sessionDoc.title, trimmedText);

    const fastPathResult = await maybeHandleFastPath(sessionId, trimmedText);
    if (fastPathResult) {
        return fastPathResult;
    }

    const agent = new Agent({
        name: 'Deck Assistant',
        instructions: DECK_ASSISTANT_INSTRUCTIONS,
        tools: createAgentTools({
            sessionId,
            userMessageId,
            includeWebSearch: shouldEnableWebSearch(trimmedText),
        }),
    });

    const historyDocs = await loadMessageHistory(sessionId);
    const items = historyDocs.map((message) => {
        switch (message.role) {
            case 'system':
                return systemItem(message.content);
            case 'assistant':
                return assistantItem(message.content);
            case 'tool':
                return assistantItem(message.content);
            case 'user':
            default:
                return userItem(message.content);
        }
    });

    try {
        const contextItems = pageUrl
            ? [systemItem(`Context: The user is currently viewing this page: ${pageUrl}`), ...items]
            : items;
        const result = await run(agent, contextItems);
        const assistantText = result.finalOutput
            ? typeof result.finalOutput === 'string'
                ? result.finalOutput
                : JSON.stringify(result.finalOutput)
            : '';

        await persistMessage(sessionId, 'assistant', assistantText);

        const { db } = await connectToDatabase();
        const toolCalls = db.collection<any>(TOOL_CALLS_COLLECTION);
        const pending = await toolCalls.find({
            session_id: new ObjectId(sessionId),
            message_id: new ObjectId(userMessageId),
            approved: false,
        }).toArray();

        return {
            success: true,
            assistantText,
            pendingToolCalls: pending.map((call: any) => ({
                id: call._id.toString(),
                name: call.name,
                arguments: call.arguments,
            })),
        };
    } catch (error: any) {
        const message = error?.message || 'AI agent failed';
        await persistMessage(sessionId, 'assistant', `Error: ${message}`);
        return { success: false, message };
    }
}
