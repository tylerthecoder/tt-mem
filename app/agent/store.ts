import type { UIMessage } from 'ai';
import { ObjectId } from 'mongodb';
import { MESSAGES_COLLECTION, SESSIONS_COLLECTION } from '@/agent/constants';
import { connectToDatabase } from '@/lib/db';
import type { AIChatSession, AIChatSessionDocument } from '@/types';

const CHAT_FORMAT_VERSION = 2 as const;

interface StoredUIMessageDocument {
    _id?: ObjectId;
    session_id: ObjectId;
    batch_id: string;
    message_id: string;
    position: number;
    createdAt: Date;
    updatedAt: Date;
    message: UIMessage;
}

export function getAIChatFormatVersion() {
    return CHAT_FORMAT_VERSION;
}

export function mapSession(doc: AIChatSessionDocument | null | undefined): AIChatSession | null {
    if (!doc || !doc._id) return null;
    return {
        id: doc._id.toString(),
        user_id: doc.user_id,
        title: doc.title,
        formatVersion: doc.formatVersion,
        activeMessageBatchId: doc.activeMessageBatchId,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}

export async function getOwnedSession(sessionId: string, userId: string) {
    const { db } = await connectToDatabase();
    const sessions = db.collection<AIChatSessionDocument>(SESSIONS_COLLECTION);
    return sessions.findOne({
        _id: new ObjectId(sessionId),
        user_id: userId,
        formatVersion: CHAT_FORMAT_VERSION,
    });
}

export async function touchSession(sessionId: string, updates?: Partial<AIChatSessionDocument>) {
    const { db } = await connectToDatabase();
    const sessions = db.collection<AIChatSessionDocument>(SESSIONS_COLLECTION);
    await sessions.updateOne(
        { _id: new ObjectId(sessionId) },
        { $set: { ...updates, updatedAt: new Date() } }
    );
}

export async function loadUIMessageHistory(sessionId: string): Promise<UIMessage[]> {
    const { db } = await connectToDatabase();
    const sessions = db.collection<AIChatSessionDocument>(SESSIONS_COLLECTION);
    const messages = db.collection<StoredUIMessageDocument>(MESSAGES_COLLECTION);
    const sessionObjectId = new ObjectId(sessionId);
    const session = await sessions.findOne(
        { _id: sessionObjectId },
        { projection: { activeMessageBatchId: 1 } }
    );
    const docs = await messages
        .find({
            session_id: sessionObjectId,
            ...(session?.activeMessageBatchId
                ? { batch_id: session.activeMessageBatchId }
                : {}),
        })
        .sort({ position: 1 })
        .toArray();

    return docs.map((doc) => doc.message);
}

export async function replaceUIMessageHistory(sessionId: string, uiMessages: UIMessage[]) {
    const { db } = await connectToDatabase();
    const sessions = db.collection<AIChatSessionDocument>(SESSIONS_COLLECTION);
    const messages = db.collection<StoredUIMessageDocument>(MESSAGES_COLLECTION);
    const sessionObjectId = new ObjectId(sessionId);
    const now = new Date();
    const nextBatchId = new ObjectId().toHexString();

    if (uiMessages.length > 0) {
        await messages.insertMany(
            uiMessages.map((message, index) => ({
                session_id: sessionObjectId,
                batch_id: nextBatchId,
                message_id: message.id,
                position: index,
                createdAt: now,
                updatedAt: now,
                message,
            }))
        );
    }

    await sessions.updateOne(
        { _id: sessionObjectId },
        uiMessages.length > 0
            ? {
                $set: {
                    activeMessageBatchId: nextBatchId,
                    updatedAt: now,
                },
            }
            : {
                $unset: {
                    activeMessageBatchId: '',
                },
                $set: {
                    updatedAt: now,
                },
            }
    );

    await messages.deleteMany(
        uiMessages.length > 0
            ? {
                session_id: sessionObjectId,
                batch_id: { $ne: nextBatchId },
            }
            : {
                session_id: sessionObjectId,
            }
    );
}
