'use server';

import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db';
import { mapMongoId } from '@/lib/utils';
import { verifyAuthToken } from '@/lib/auth';
import type { AIChatMessage, AIChatMessageDocument, AIChatSession, AIChatSessionDocument, AIChatToolCall } from '@/types';
import { AnswerMode, FrontContentType } from '@/types';
import { fetchDeckByIdAction, fetchDecksAction, createDeckAction } from '@/actions/decks';
import { fetchDeckCardsAction, createCardAction, updateCardAction, deleteCardAction } from '@/actions/cards';
import { z } from 'zod';
import { Agent, run, tool, user as userItem, assistant as assistantItem, system as systemItem } from '@openai/agents';

// Collections
const SESSIONS_COLLECTION = 'ai_chat_sessions';
const MESSAGES_COLLECTION = 'ai_chat_messages';
const TOOL_CALLS_COLLECTION = 'ai_chat_tool_calls';

// Helper mappers
function mapSession(doc: AIChatSessionDocument | null | undefined): AIChatSession | null {
    const mapped = mapMongoId(doc);
    if (!mapped) return null;
    return mapped as unknown as AIChatSession;
}

function mapMessage(doc: AIChatMessageDocument | null | undefined): AIChatMessage | null {
    const mapped = mapMongoId(doc);
    if (!mapped) return null;
    return mapped as unknown as AIChatMessage;
}

// Create a new AI chat session
export async function createAIChatSessionAction(token: string | undefined): Promise<{ success: boolean; session?: AIChatSession; message?: string }> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };

    const { db } = await connectToDatabase();
    const sessions = db.collection<AIChatSessionDocument>(SESSIONS_COLLECTION);
    const now = new Date();
    const doc: AIChatSessionDocument = { user_id: user.user, title: 'AI Assistant', createdAt: now, updatedAt: now };
    const res = await sessions.insertOne(doc);
    const created = await sessions.findOne({ _id: res.insertedId });
    const mapped = mapSession(created);
    if (!mapped) return { success: false, message: 'Failed to create session' };
    return { success: true, session: mapped };
}

// Fetch messages for a session
export async function getAIChatMessagesAction(sessionId: string, token: string | undefined): Promise<{ success: boolean; messages?: AIChatMessage[]; message?: string }> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };
    if (!sessionId || !ObjectId.isValid(sessionId)) return { success: false, message: 'Invalid session id' };
    const { db } = await connectToDatabase();
    const sessions = db.collection<AIChatSessionDocument>(SESSIONS_COLLECTION);
    const messagesCol = db.collection<AIChatMessageDocument>(MESSAGES_COLLECTION);
    const sessionDoc = await sessions.findOne({ _id: new ObjectId(sessionId) });
    if (!sessionDoc) return { success: false, message: 'Session not found' };
    const docs = await messagesCol.find({ session_id: new ObjectId(sessionId) }).sort({ createdAt: 1 }).toArray();
    const mapped = docs.map(mapMessage).filter((m): m is AIChatMessage => m !== null);
    return { success: true, messages: mapped };
}

// List sessions for the current user
export async function listAIChatSessionsAction(token: string | undefined): Promise<{ success: boolean; sessions?: AIChatSession[]; message?: string }> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };
    const { db } = await connectToDatabase();
    const sessions = db.collection<AIChatSessionDocument>(SESSIONS_COLLECTION);
    const docs = await sessions.find({ user_id: user.user }).sort({ updatedAt: -1 }).toArray();
    const mapped = docs.map(mapSession).filter((s): s is AIChatSession => s !== null);
    return { success: true, sessions: mapped };
}

// Shared optional rich card fields
const richCardFields = {
    answer_mode: z.enum(['flip', 'type_in', 'multiple_choice', 'map_select']).optional(),
    front_content_type: z.enum(['text', 'image', 'map_highlight']).optional(),
    front_image_url: z.string().optional(),
    front_map_country_code: z.string().optional(),
    correct_answer: z.string().optional(),
    choices: z.array(z.string()).optional(),
    correct_country_code: z.string().optional(),
    extra_context: z.string().optional(),
};

// Schema for tool payloads
const CardInputSchema = z.object({
    deckId: z.string().min(1),
    front_text: z.string().min(1),
    back_text: z.string().min(1),
    ...richCardFields,
});

const EditCardSchema = z.object({
    deckId: z.string().min(1),
    cardId: z.string().min(1),
    front_text: z.string().optional().nullable(),
    back_text: z.string().optional().nullable(),
    ...richCardFields,
});

const MultiEditCardSchema = z.object({
    deckId: z.string().min(1),
    edits: z.array(z.object({
        cardId: z.string().min(1),
        front_text: z.string().optional().nullable(),
        back_text: z.string().optional().nullable(),
        ...richCardFields,
    })).min(1)
});

const RemoveCardSchema = z.object({
    deckId: z.string().min(1),
    cardId: z.string().min(1)
});

const CreateDeckSchema = z.object({
    name: z.string().min(1),
    cards: z.array(z.object({
        front_text: z.string().min(1),
        back_text: z.string().min(1),
        ...richCardFields,
    }))
});

const ViewDeckSchema = z.object({
    deckId: z.string().min(1)
});

// Persist a message
async function persistMessage(sessionId: string, role: AIChatMessageDocument['role'], content: string, tool_calls?: AIChatToolCall[]) {
    const { db } = await connectToDatabase();
    const messages = db.collection<AIChatMessageDocument>(MESSAGES_COLLECTION);
    const doc: AIChatMessageDocument = {
        session_id: new ObjectId(sessionId),
        role,
        content,
        tool_calls,
        createdAt: new Date(),
    };
    const res = await messages.insertOne(doc);
    // Bump session updatedAt
    const sessions = db.collection<AIChatSessionDocument>(SESSIONS_COLLECTION);
    await sessions.updateOne({ _id: new ObjectId(sessionId) }, { $set: { updatedAt: new Date() } });
    return res.insertedId.toString();
}

// Create a pending tool call record
async function createPendingToolCall(sessionId: string, messageId: string, name: string, args: unknown) {
    const { db } = await connectToDatabase();
    const toolCalls = db.collection<any>(TOOL_CALLS_COLLECTION);
    const doc = {
        session_id: new ObjectId(sessionId),
        message_id: new ObjectId(messageId),
        name,
        arguments: args,
        approved: false,
        createdAt: new Date(),
    };
    const res = await toolCalls.insertOne(doc);
    return res.insertedId.toString();
}

// List pending tool calls for a session
export async function getPendingToolCallsAction(sessionId: string, token: string | undefined): Promise<{ success: boolean; toolCalls?: any[]; message?: string }> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };
    if (!sessionId || !ObjectId.isValid(sessionId)) return { success: false, message: 'Invalid session id' };
    const { db } = await connectToDatabase();
    const toolCalls = db.collection<any>(TOOL_CALLS_COLLECTION);
    const list = await toolCalls.find({ session_id: new ObjectId(sessionId), approved: false }).sort({ createdAt: 1 }).toArray();
    return { success: true, toolCalls: list.map(c => ({ id: c._id.toString(), name: c.name, arguments: c.arguments, createdAt: c.createdAt })) };
}

// Execute a tool call after approval
export async function approveToolCallAction(sessionId: string, toolCallId: string, approve: boolean, token: string | undefined): Promise<{ success: boolean; message?: string }> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };
    if (!sessionId || !ObjectId.isValid(sessionId) || !toolCallId || !ObjectId.isValid(toolCallId)) return { success: false, message: 'Invalid ids' };
    const { db } = await connectToDatabase();
    const toolCalls = db.collection<any>(TOOL_CALLS_COLLECTION);
    const call = await toolCalls.findOne({ _id: new ObjectId(toolCallId), session_id: new ObjectId(sessionId) });
    if (!call) return { success: false, message: 'Tool call not found' };

    if (!approve) {
        await toolCalls.updateOne({ _id: call._id }, { $set: { approved: false, executedAt: new Date(), error: 'Rejected by user' } });
        await persistMessage(sessionId, 'system', `Rejected tool: ${call.name}`);
        return { success: true };
    }

    // Execute according to tool name
    let result: unknown;
    try {
        switch (call.name) {
            case 'CreateDeck': {
                const parsed = CreateDeckSchema.parse(call.arguments);
                // Create empty deck first, then add cards with rich fields
                const deckRes = await createDeckAction(parsed.name, token);
                if (!deckRes.success || !deckRes.deck) {
                    throw new Error(deckRes.message || 'Failed to create deck');
                }
                const createdCards = [];
                for (const c of parsed.cards) {
                    const cardRes = await createCardAction({
                        deckId: deckRes.deck.id,
                        frontText: c.front_text,
                        backText: c.back_text,
                        token,
                        answerMode: c.answer_mode as AnswerMode | undefined,
                        frontContentType: c.front_content_type as FrontContentType | undefined,
                        frontImageUrl: c.front_image_url,
                        frontMapCountryCode: c.front_map_country_code,
                        correctAnswer: c.correct_answer,
                        choices: c.choices,
                        correctCountryCode: c.correct_country_code,
                        extraContext: c.extra_context,
                    });
                    if (cardRes.success && cardRes.card) createdCards.push(cardRes.card);
                }
                result = { deck: deckRes.deck, cardsCreated: createdCards.length };
                break;
            }
            case 'AddCard': {
                const parsed = CardInputSchema.parse(call.arguments);
                const res = await createCardAction({
                    deckId: parsed.deckId,
                    frontText: parsed.front_text,
                    backText: parsed.back_text,
                    token,
                    answerMode: parsed.answer_mode as AnswerMode | undefined,
                    frontContentType: parsed.front_content_type as FrontContentType | undefined,
                    frontImageUrl: parsed.front_image_url,
                    frontMapCountryCode: parsed.front_map_country_code,
                    correctAnswer: parsed.correct_answer,
                    choices: parsed.choices,
                    correctCountryCode: parsed.correct_country_code,
                    extraContext: parsed.extra_context,
                });
                result = res.success ? res.card : res.message;
                break;
            }
            case 'EditCard': {
                const parsed = EditCardSchema.parse(call.arguments);
                const res = await updateCardAction({
                    cardId: parsed.cardId,
                    deckId: parsed.deckId,
                    frontText: parsed.front_text ?? undefined,
                    backText: parsed.back_text ?? undefined,
                    token,
                    answerMode: parsed.answer_mode as AnswerMode | undefined,
                    frontContentType: parsed.front_content_type as FrontContentType | undefined,
                    frontImageUrl: parsed.front_image_url,
                    frontMapCountryCode: parsed.front_map_country_code,
                    correctAnswer: parsed.correct_answer,
                    choices: parsed.choices,
                    correctCountryCode: parsed.correct_country_code,
                    extraContext: parsed.extra_context,
                });
                result = res.success ? res.card : res.message;
                break;
            }
            case 'MultiEditCard': {
                const parsed = MultiEditCardSchema.parse(call.arguments);
                const outcomes: { cardId: string; success: boolean; message?: string }[] = [];
                for (const edit of parsed.edits) {
                    const res = await updateCardAction({
                        cardId: edit.cardId,
                        deckId: parsed.deckId,
                        frontText: edit.front_text ?? undefined,
                        backText: edit.back_text ?? undefined,
                        token,
                        answerMode: edit.answer_mode as AnswerMode | undefined,
                        frontContentType: edit.front_content_type as FrontContentType | undefined,
                        frontImageUrl: edit.front_image_url,
                        frontMapCountryCode: edit.front_map_country_code,
                        correctAnswer: edit.correct_answer,
                        choices: edit.choices,
                        correctCountryCode: edit.correct_country_code,
                        extraContext: edit.extra_context,
                    });
                    outcomes.push({ cardId: edit.cardId, success: !!res.success, message: res.message });
                }
                result = outcomes;
                break;
            }
            case 'RemoveCard': {
                const parsed = RemoveCardSchema.parse(call.arguments);
                const res = await deleteCardAction({ cardId: parsed.cardId, deckId: parsed.deckId, token });
                result = res.success ? 'Deleted' : res.message;
                break;
            }
            default:
                throw new Error('Unknown tool name for approval execution');
        }
        await toolCalls.updateOne({ _id: call._id }, { $set: { approved: true, executedAt: new Date(), result } });
        await persistMessage(sessionId, 'tool', JSON.stringify({ tool: call.name, result }));
        return { success: true };
    } catch (err: any) {
        await toolCalls.updateOne({ _id: call._id }, { $set: { approved: true, executedAt: new Date(), error: err?.message || 'Unknown error' } });
        await persistMessage(sessionId, 'tool', JSON.stringify({ tool: call.name, error: err?.message || 'Unknown error' }));
        return { success: false, message: err?.message || 'Execution failed' };
    }
}

// Send a user message and get assistant response, generating pending tool calls as needed
export async function sendAIChatMessageAction(sessionId: string, userText: string, token: string | undefined): Promise<{ success: boolean; assistantText?: string; pendingToolCalls?: { id: string; name: string; arguments: unknown }[]; message?: string }> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };
    if (!sessionId || !ObjectId.isValid(sessionId)) return { success: false, message: 'Invalid session id' };
    if (!userText || !userText.trim()) return { success: false, message: 'Message cannot be empty' };

    // persist user message
    const userMessageId = await persistMessage(sessionId, 'user', userText.trim());

    // Define tools
    const addCardTool = tool({
        name: 'AddCard',
        description: 'Add a card to a deck. Supports rich card types: flip, type_in, multiple_choice, map_select.',
        parameters: z.object({
            deckId: z.string(),
            front_text: z.string(),
            back_text: z.string(),
            ...richCardFields,
        }),
        execute: async (args: unknown) => {
            // Create pending approval
            const pendingId = await createPendingToolCall(sessionId, userMessageId, 'AddCard', args);
            return { pendingApproval: true, toolCallId: pendingId };
        }
    });

    const editCardTool = tool({
        name: 'EditCard',
        description: 'Edit a card in a deck. Can update text, answer mode, choices, and other rich fields.',
        parameters: z.object({
            deckId: z.string(),
            cardId: z.string(),
            front_text: z.string().optional().nullable(),
            back_text: z.string().optional().nullable(),
            ...richCardFields,
        }),
        execute: async (args: unknown) => {
            const pendingId = await createPendingToolCall(sessionId, userMessageId, 'EditCard', args);
            return { pendingApproval: true, toolCallId: pendingId };
        }
    });

    const multiEditCardTool = tool({
        name: 'MultiEditCard',
        description: 'Apply multiple edits to cards within a deck. Each edit can update text and rich card fields.',
        parameters: z.object({
            deckId: z.string(),
            edits: z.array(z.object({
                cardId: z.string(),
                front_text: z.string().optional().nullable(),
                back_text: z.string().optional().nullable(),
                ...richCardFields,
            }))
        }),
        execute: async (args: unknown) => {
            const pendingId = await createPendingToolCall(sessionId, userMessageId, 'MultiEditCard', args);
            return { pendingApproval: true, toolCallId: pendingId };
        }
    });

    const removeCardTool = tool({
        name: 'RemoveCard',
        description: 'Remove a card from a deck',
        parameters: z.object({
            deckId: z.string(),
            cardId: z.string(),
        }),
        execute: async (args: unknown) => {
            const pendingId = await createPendingToolCall(sessionId, userMessageId, 'RemoveCard', args);
            return { pendingApproval: true, toolCallId: pendingId };
        }
    });

    const createDeckTool = tool({
        name: 'CreateDeck',
        description: 'Create a new deck with a list of cards. Each card supports rich types: flip, type_in, multiple_choice, map_select with optional front content types.',
        parameters: z.object({
            name: z.string(),
            cards: z.array(z.object({
                front_text: z.string(),
                back_text: z.string(),
                ...richCardFields,
            })),
        }),
        execute: async (args: unknown) => {
            const pendingId = await createPendingToolCall(sessionId, userMessageId, 'CreateDeck', args);
            return { pendingApproval: true, toolCallId: pendingId };
        }
    });

    const viewDeckTool = tool({
        name: 'ViewDeck',
        description: 'View a deck and its cards by deckId',
        parameters: z.object({ deckId: z.string() }),
        execute: async (args: any) => {
            // Auto-approve view
            const parsed = ViewDeckSchema.safeParse(args);
            if (!parsed.success) {
                return { success: false, message: parsed.error.message };
            }
            const deckRes = await fetchDeckByIdAction(parsed.data.deckId);
            const cardsRes = await fetchDeckCardsAction(parsed.data.deckId);
            return { deck: deckRes.deck, cards: cardsRes.cards };
        }
    });

    const viewAllDecksTool = tool({
        name: 'ViewAllDecks',
        description: 'List all decks with their ids and names',
        parameters: z.object({}),
        execute: async () => {
            const res = await fetchDecksAction();
            return { decks: (res.decks || []).map(d => ({ id: d.id, name: d.name })) };
        }
    });

    const agent = new Agent({
        name: 'Deck Assistant',
        instructions: `You are an assistant that helps manage flashcard decks. You have tools to view, create, edit, and delete decks and cards.

Cards support multiple answer modes:
- "flip" (default): Simple flip card — front is the question, back is the answer
- "type_in": User types their answer, which is scored against correct_answer
- "multiple_choice": User picks from choices, scored against correct_answer
- "map_select": User clicks a country on a world map, scored against correct_country_code

Cards also support different front content types:
- "text" (default): Plain text question
- "image": Shows an image (front_image_url) with front_text as caption
- "map_highlight": Shows a world map with a highlighted country (front_map_country_code) as the question

When creating geography/country decks, use map_select answer mode with correct_country_code (ISO alpha-2 codes like "US", "FR", "JP") and optionally map_highlight front content with front_map_country_code.

When creating vocabulary or factual knowledge decks, mix type_in and multiple_choice modes. Use extra_context to provide additional learning info shown after answering.

Tool calls that modify data (create, edit, delete) require user approval unless auto-approve is enabled.`,
        tools: [createDeckTool, addCardTool, editCardTool, multiEditCardTool, removeCardTool, viewDeckTool, viewAllDecksTool]
    });

    // Build history for the session and run the agent with full context
    const { db } = await connectToDatabase();
    const messagesCol = db.collection<AIChatMessageDocument>(MESSAGES_COLLECTION);
    const historyDocs = await messagesCol.find({ session_id: new ObjectId(sessionId) }).sort({ createdAt: 1 }).toArray();
    const items = historyDocs.map((m) => {
        switch (m.role) {
            case 'system':
                return systemItem(m.content);
            case 'assistant':
                return assistantItem(m.content);
            case 'tool':
                // Treat tool output as assistant content for context
                return assistantItem(m.content);
            case 'user':
            default:
                return userItem(m.content);
        }
    });

    const result = await run(agent, items);

    const assistantText = result.finalOutput ? (typeof result.finalOutput === 'string' ? result.finalOutput : JSON.stringify(result.finalOutput)) : '';

    // Save assistant message
    await persistMessage(sessionId, 'assistant', assistantText);

    // Return any pending approvals created during tool execution for this message
    const toolCalls = db.collection<any>(TOOL_CALLS_COLLECTION);
    const pending = await toolCalls.find({ session_id: new ObjectId(sessionId), message_id: new ObjectId(userMessageId), approved: false }).toArray();
    const pendingSummaries = pending.map((c: any) => ({ id: c._id.toString(), name: c.name, arguments: c.arguments }));

    return { success: true, assistantText, pendingToolCalls: pendingSummaries };
}


