'use server';

import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db';
import { mapMongoId } from '@/lib/utils';
import type { ReviewEventDocument, CardDocument, ReviewHistoryEntry } from '@/types';

// Helper to map combined data (consider placing in utils if reused)
function mapReviewHistoryEntry(eventDoc: ReviewEventDocument, cardMap: Map<string, { front: string; back: string }>): ReviewHistoryEntry | null {
    const mappedEvent = mapMongoId(eventDoc);
    if (!mappedEvent) return null;

    const cardIdStr = eventDoc.card_id.toString();
    const cardData = cardMap.get(cardIdStr);

    if (!cardData) {
        console.warn(`Card data not found for review event ${mappedEvent.id}, card_id ${cardIdStr}`);
        // Decide how to handle missing card data - skip entry or return with placeholders?
        // Skipping for now:
        return null;
    }

    return {
        eventId: mappedEvent.id,
        cardId: cardIdStr,
        cardFront: cardData.front,
        cardBack: cardData.back,
        result: mappedEvent.result,
        timestamp: mappedEvent.timestamp,
    };
}


interface FetchReviewHistoryResult {
    success: boolean;
    history?: ReviewHistoryEntry[];
    message?: string;
}

export async function fetchDeckReviewHistoryAction(deckId: string): Promise<FetchReviewHistoryResult> {
    if (!deckId || !ObjectId.isValid(deckId)) {
        return { success: false, message: 'Valid Deck ID is required' };
    }

    try {
        const { db } = await connectToDatabase();
        const cardsCollection = db.collection<CardDocument>('cards');
        const reviewsCollection = db.collection<ReviewEventDocument>('review_events');

        // 1. Find all cards belonging to the deck
        const cardDocs = await cardsCollection.find(
            { deck_id: new ObjectId(deckId) },
            { projection: { _id: 1, front_text: 1, back_text: 1 } } // Only fetch necessary fields
        ).toArray();

        if (cardDocs.length === 0) {
            return { success: true, history: [] }; // No cards, so no history
        }

        const cardIds = cardDocs.map(doc => doc._id);
        // Create a map for quick lookup of card text by ID
        const cardMap = new Map<string, { front: string; back: string }>();
        cardDocs.forEach(doc => {
            cardMap.set(doc._id.toString(), { front: doc.front_text, back: doc.back_text });
        });

        // 2. Find all review events for these cards
        const reviewEventDocs = await reviewsCollection.find(
            { card_id: { $in: cardIds } }
        ).sort({ timestamp: -1 }).toArray(); // Sort newest first

        // 3. Combine and map the data
        const history = reviewEventDocs
            .map(doc => mapReviewHistoryEntry(doc, cardMap))
            .filter((entry): entry is ReviewHistoryEntry => entry !== null);

        return { success: true, history };

    } catch (error) {
        console.error('[Fetch Review History Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch review history';
        return { success: false, message };
    }
}