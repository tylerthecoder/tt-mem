'use server';

import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db';
import { ReviewEventDocument, ReviewResult, CardDocument } from '@/types';

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