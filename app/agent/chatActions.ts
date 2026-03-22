'use server';

import type { UIMessage } from 'ai';
import { ObjectId } from 'mongodb';
import { DEFAULT_SESSION_TITLE, SESSIONS_COLLECTION } from '@/agent/constants';
import { connectToDatabase } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';
import {
    getOwnedSession,
    getAIChatFormatVersion,
    loadUIMessageHistory,
    mapSession,
} from '@/agent/store';
import type { AIChatSession, AIChatSessionDocument } from '@/types';

export async function createAIChatSessionAction(token: string | undefined): Promise<{ success: boolean; session?: AIChatSession; message?: string }> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };

    const { db } = await connectToDatabase();
    const sessions = db.collection<AIChatSessionDocument>(SESSIONS_COLLECTION);
    const now = new Date();
    const res = await sessions.insertOne({
        user_id: user.user,
        title: DEFAULT_SESSION_TITLE,
        formatVersion: getAIChatFormatVersion(),
        createdAt: now,
        updatedAt: now,
    });

    const created = await sessions.findOne({ _id: res.insertedId });
    const mapped = mapSession(created);
    if (!mapped) return { success: false, message: 'Failed to create session' };
    return { success: true, session: mapped };
}

export async function getAIChatMessagesAction(sessionId: string, token: string | undefined): Promise<{ success: boolean; messages?: UIMessage[]; message?: string }> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };
    if (!sessionId || !ObjectId.isValid(sessionId)) return { success: false, message: 'Invalid session id' };

    const sessionDoc = await getOwnedSession(sessionId, user.user);
    if (!sessionDoc) return { success: false, message: 'Session not found' };

    const messages = await loadUIMessageHistory(sessionId);
    return { success: true, messages };
}

export async function listAIChatSessionsAction(token: string | undefined): Promise<{ success: boolean; sessions?: AIChatSession[]; message?: string }> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };

    const { db } = await connectToDatabase();
    const sessions = db.collection<AIChatSessionDocument>(SESSIONS_COLLECTION);
    const docs = await sessions
        .find({
            user_id: user.user,
            formatVersion: getAIChatFormatVersion(),
        })
        .sort({ updatedAt: -1 })
        .toArray();
    const mapped = docs.map(mapSession).filter((session): session is AIChatSession => session !== null);
    return { success: true, sessions: mapped };
}
