'use server';

import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db';
import { mapMongoId } from '@/lib/utils';
import { verifyAuthToken } from '@/lib/auth';
import type { AIChatMessage, AIChatMessageDocument, AIChatSession, AIChatSessionDocument, AIChatToolCall } from '@/types';
import { fetchDeckByIdAction, fetchDecksAction } from '@/actions/decks';
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

// Schema for tool payloads
const CardInputSchema = z.object({
    deckId: z.string().min(1),
    front_text: z.string().min(1),
    back_text: z.string().min(1)
});

const EditCardSchema = z.object({
    deckId: z.string().min(1),
    cardId: z.string().min(1),
    front_text: z.string().optional().nullable(),
    back_text: z.string().optional().nullable()
}).refine((v) => !!v.front_text || !!v.back_text, { message: 'At least one of front_text or back_text must be provided' });

const MultiEditCardSchema = z.object({
    deckId: z.string().min(1),
    edits: z.array(z.object({
        cardId: z.string().min(1),
        front_text: z.string().optional().nullable(),
        back_text: z.string().optional().nullable()
    }).refine((v) => !!v.front_text || !!v.back_text, { message: 'Each edit must provide front_text or back_text' })).min(1)
});

const RemoveCardSchema = z.object({
    deckId: z.string().min(1),
    cardId: z.string().min(1)
});

const CreateDeckSchema = z.object({
    name: z.string().min(1),
    cards: z.array(z.object({ front_text: z.string().min(1), back_text: z.string().min(1) }))
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
                // Use importDeckAction style to create deck with multiple cards
                const { importDeckAction } = await import('@/actions/decks');
                const res = await importDeckAction(parsed.name, parsed.cards.map((c: any) => ({ front: c.front_text, back: c.back_text })), token);
                result = res.success ? res.deck : res.message;
                break;
            }
            case 'AddCard': {
                const parsed = CardInputSchema.parse(call.arguments);
                const res = await createCardAction({ deckId: parsed.deckId, frontText: parsed.front_text, backText: parsed.back_text, token });
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
                    token
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
                        token
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
        description: 'Add a card to a deck with front and back text',
        parameters: z.object({
            deckId: z.string(),
            front_text: z.string(),
            back_text: z.string(),
        }),
        execute: async (args: unknown) => {
            // Create pending approval
            const pendingId = await createPendingToolCall(sessionId, userMessageId, 'AddCard', args);
            return { pendingApproval: true, toolCallId: pendingId };
        }
    });

    const editCardTool = tool({
        name: 'EditCard',
        description: 'Edit a card in a deck',
        parameters: z.object({
            deckId: z.string(),
            cardId: z.string(),
            front_text: z.string().optional().nullable(),
            back_text: z.string().optional().nullable(),
        }),
        execute: async (args: unknown) => {
            const pendingId = await createPendingToolCall(sessionId, userMessageId, 'EditCard', args);
            return { pendingApproval: true, toolCallId: pendingId };
        }
    });

    const multiEditCardTool = tool({
        name: 'MultiEditCard',
        description: 'Apply multiple edits to cards within a deck',
        parameters: z.object({
            deckId: z.string(),
            edits: z.array(z.object({
                cardId: z.string(),
                front_text: z.string().optional().nullable(),
                back_text: z.string().optional().nullable(),
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
        description: 'Create a new deck with a list of cards',
        parameters: z.object({
            name: z.string(),
            cards: z.array(z.object({ front_text: z.string(), back_text: z.string() })),
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
        instructions: 'You are an assistant that helps manage flashcard decks. Use tools to view decks, add/edit/remove cards, and create new decks. For any changes, propose the appropriate tool call. Tool calls other than ViewDeck require user approval and may not execute immediately.',
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


