'use server';

import { z } from 'zod';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/db';
import type { SpeedReadingAttemptDocument } from '@/types';

const SubmitSchema = z.object({
    text: z.string().min(1),
    wpm: z.number().int().min(50).max(2000),
    durationMs: z.number().int().min(1000),
    rating: z.number().int().min(1).max(10),
});

export async function submitSpeedReadingAttemptAction(input: z.infer<typeof SubmitSchema>) {
    const parsed = SubmitSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, message: 'Invalid input.' } as const;
    }

    const { text, wpm, durationMs, rating } = parsed.data;

    try {
        const { db } = await connectToDatabase();
        const coll = db.collection<SpeedReadingAttemptDocument>('speed_reading_attempts');

        const textWords = text.trim().split(/\s+/).filter(Boolean).length;
        const textChars = text.length;
        const textHash = crypto.createHash('sha256').update(text).digest('hex');

        const doc: Omit<SpeedReadingAttemptDocument, '_id'> = {
            text_hash: textHash,
            text_excerpt: text.slice(0, 200),
            text_words: textWords,
            text_chars: textChars,
            wpm,
            duration_ms: durationMs,
            perceived_comprehension: rating,
            createdAt: new Date(),
        };

        const res = await coll.insertOne(doc as SpeedReadingAttemptDocument);
        if (!res.insertedId) {
            throw new Error('Insert failed');
        }

        return { success: true, id: res.insertedId.toString() } as const;
    } catch (err) {
        console.error('[Speed Reading] Failed to insert attempt', err);
        return { success: false, message: 'Failed to store attempt.' } as const;
    }
}

