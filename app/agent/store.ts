import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db';
import { MESSAGES_COLLECTION, SESSIONS_COLLECTION, TOOL_CALLS_COLLECTION } from '@/agent/constants';
import type { PendingToolCallSummary } from '@/agent/types';
import type { AIChatMessage, AIChatMessageDocument, AIChatSession, AIChatSessionDocument, AIChatToolCall } from '@/types';

export function mapSession(doc: AIChatSessionDocument | null | undefined): AIChatSession | null {
    if (!doc || !doc._id) return null;
    return {
        id: doc._id.toString(),
        user_id: doc.user_id,
        title: doc.title,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}

export function mapMessage(doc: AIChatMessageDocument | null | undefined): AIChatMessage | null {
    if (!doc || !doc._id) return null;
    return {
        id: doc._id.toString(),
        role: doc.role,
        content: doc.content,
        tool_calls: doc.tool_calls,
        createdAt: doc.createdAt,
    };
}

export async function getOwnedSession(sessionId: string, userId: string) {
    const { db } = await connectToDatabase();
    const sessions = db.collection<AIChatSessionDocument>(SESSIONS_COLLECTION);
    return sessions.findOne({ _id: new ObjectId(sessionId), user_id: userId });
}

export async function touchSession(sessionId: string, updates?: Partial<AIChatSessionDocument>) {
    const { db } = await connectToDatabase();
    const sessions = db.collection<AIChatSessionDocument>(SESSIONS_COLLECTION);
    await sessions.updateOne(
        { _id: new ObjectId(sessionId) },
        { $set: { ...updates, updatedAt: new Date() } }
    );
}

export async function persistMessage(
    sessionId: string,
    role: AIChatMessageDocument['role'],
    content: string,
    toolCalls?: AIChatToolCall[]
) {
    const { db } = await connectToDatabase();
    const messages = db.collection<AIChatMessageDocument>(MESSAGES_COLLECTION);
    const doc: AIChatMessageDocument = {
        session_id: new ObjectId(sessionId),
        role,
        content,
        tool_calls: toolCalls,
        createdAt: new Date(),
    };
    const res = await messages.insertOne(doc);
    await touchSession(sessionId);
    return res.insertedId.toString();
}

export async function createPendingToolCall(sessionId: string, messageId: string, name: string, args: unknown) {
    const { db } = await connectToDatabase();
    const toolCalls = db.collection(TOOL_CALLS_COLLECTION);
    const res = await toolCalls.insertOne({
        session_id: new ObjectId(sessionId),
        message_id: new ObjectId(messageId),
        name,
        arguments: args,
        approved: false,
        createdAt: new Date(),
    });
    return res.insertedId.toString();
}

export async function listPendingToolCalls(sessionId: string): Promise<PendingToolCallSummary[]> {
    const { db } = await connectToDatabase();
    const toolCalls = db.collection<{
        _id: ObjectId;
        name: string;
        arguments: unknown;
        createdAt: Date;
    }>(TOOL_CALLS_COLLECTION);
    const list = await toolCalls
        .find({ session_id: new ObjectId(sessionId), approved: false })
        .sort({ createdAt: 1 })
        .toArray();
    return list.map((call) => ({
        id: call._id.toString(),
        name: call.name,
        arguments: call.arguments,
        createdAt: call.createdAt,
    }));
}

export async function loadMessageHistory(sessionId: string) {
    const { db } = await connectToDatabase();
    const messages = db.collection<AIChatMessageDocument>(MESSAGES_COLLECTION);
    return messages.find({ session_id: new ObjectId(sessionId) }).sort({ createdAt: 1 }).toArray();
}
