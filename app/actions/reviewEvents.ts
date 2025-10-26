'use server';

import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db';
import { ReviewEventDocument, ReviewResult, CardDocument } from '@/types';
import type { ReviewEvent } from '@/types'; // Import client-side type
import { mapMongoId } from '@/lib/utils'; // Import the mapper

interface LastReviewResult {
    cardId: string;
    lastResult: ReviewResult;
    timestamp: Date;
}

// Fetches the most recent review event for each card within a specific deck.
export async function getLastReviewEventPerCard(deckId: string): Promise<Map<string, LastReviewResult>> {
    if (!deckId || !ObjectId.isValid(deckId)) {
        throw new Error('Invalid Deck ID provided.');
    }

    const { db } = await connectToDatabase();
    const reviewEventsCollection = db.collection<ReviewEventDocument>('review_events');
    const cardsCollection = db.collection<CardDocument>('cards');

    try {
        // 1. Find all card IDs belonging to the deck
        const cardIdsInDeck = await cardsCollection
            .find({ deck_id: new ObjectId(deckId) }, { projection: { _id: 1 } })
            .map((doc: { _id: ObjectId }) => doc._id)
            .toArray();

        if (cardIdsInDeck.length === 0) {
            return new Map(); // No cards in deck, so no review history
        }

        // 2. Use aggregation to find the last review event for each relevant card
        const aggregationPipeline = [
            // Match only events for cards in the target deck
            { $match: { card_id: { $in: cardIdsInDeck } } },
            // Sort by timestamp descending to get the latest first
            { $sort: { timestamp: -1 } },
            // Group by card_id and take the first document (which is the latest due to sorting)
            {
                $group: {
                    _id: "$card_id",
                    lastEvent: { $first: "$$ROOT" } // Get the whole document
                }
            },
            // Reshape the output
            {
                $project: {
                    _id: 0, // Exclude the grouping _id
                    cardId: { $toString: "$_id" }, // Convert card_id ObjectId to string
                    lastResult: "$lastEvent.result",
                    timestamp: "$lastEvent.timestamp"
                }
            }
        ];

        const results: LastReviewResult[] = await reviewEventsCollection.aggregate<LastReviewResult>(aggregationPipeline).toArray();

        // Convert the array of results into a Map for easy lookup by cardId
        const resultMap = new Map<string, LastReviewResult>();
        results.forEach(item => {
            resultMap.set(item.cardId, item);
        });

        return resultMap;

    } catch (error) {
        console.error("Error fetching last review events:", error);
        throw new Error("Failed to fetch review history.");
    }
}

// --- Fetch Latest Review For a Single Card ---

interface LatestReviewResult {
    success: boolean;
    reviewEvent?: ReviewEvent | null;
    message?: string;
}

// Fetches the single most recent review event for a specific card.
export async function getLatestReviewForCardAction(cardId: string): Promise<LatestReviewResult> {
    if (!cardId || !ObjectId.isValid(cardId)) {
        return { success: false, message: 'Invalid Card ID provided.' };
    }

    // TODO: Add authentication check if needed.

    try {
        const { db } = await connectToDatabase();
        const reviewEventsCollection = db.collection<ReviewEventDocument>('review_events');

        const latestEventDoc = await reviewEventsCollection.findOne(
            { card_id: new ObjectId(cardId) },
            { sort: { timestamp: -1 } }
        );

        if (!latestEventDoc) {
            // It's not an error if no review exists, return success: true but null event
            return { success: true, reviewEvent: null };
        }

        // Map the event before returning
        const mappedEvent = mapMongoId(latestEventDoc);

        // Check if mapping was successful and card_id is ObjectId (it should be)
        if (mappedEvent?.card_id instanceof ObjectId) {
            const finalEvent: ReviewEvent = {
                id: mappedEvent.id,
                card_id: mappedEvent.card_id.toString(), // Convert ObjectId to string
                result: mappedEvent.result,
                timestamp: mappedEvent.timestamp,
                wasFlipped: mappedEvent.was_flipped ?? false,
            };
            return { success: true, reviewEvent: finalEvent };
        } else {
            // Mapping failed - this indicates an issue
            console.error(`Failed to map latest review event document for card ${cardId}. Mapped:`, mappedEvent);
            return { success: false, message: 'Failed to process review event data.' };
        }

    } catch (error) {
        console.error(`Error fetching latest review event for card ${cardId}:`, error);
        const message = error instanceof Error ? error.message : 'Failed to fetch latest review event.';
        return { success: false, message };
    }
}
