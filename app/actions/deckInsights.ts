'use server';

import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db';
import type { DeckDocument, ReviewEventDocument, CardDocument } from '@/types';

interface RecentDeckItem {
    deckId: string;
    deckName: string;
    lastPlayedAt: Date;
}

interface RecentDecksResult {
    success: boolean;
    recents?: RecentDeckItem[];
    message?: string;
}

export async function getRecentlyPlayedDecksAction(limit = 5): Promise<RecentDecksResult> {
    try {
        const { db } = await connectToDatabase();
        const reviews = db.collection<ReviewEventDocument>('review_events');
        const cards = db.collection<CardDocument>('cards');
        const decks = db.collection<DeckDocument>('decks');

        // Aggregate latest review per deck via card join
        const pipeline = [
            // Join cards to get deck_id
            {
                $lookup: {
                    from: 'cards',
                    localField: 'card_id',
                    foreignField: '_id',
                    as: 'card',
                },
            },
            { $unwind: '$card' },
            // Group by deck_id to get max timestamp
            {
                $group: {
                    _id: '$card.deck_id',
                    lastPlayedAt: { $max: '$timestamp' },
                },
            },
            { $sort: { lastPlayedAt: -1 } },
            { $limit: limit },
        ];

        const grouped = await reviews.aggregate<{ _id: ObjectId; lastPlayedAt: Date }>(pipeline).toArray();

        if (grouped.length === 0) {
            return { success: true, recents: [] };
        }

        const deckIds = grouped.map((g) => g._id);
        const deckDocs = await decks
            .find({ _id: { $in: deckIds } }, { projection: { name: 1 } })
            .toArray();
        const nameMap = new Map<string, string>();
        deckDocs.forEach((d) => nameMap.set(d._id.toString(), d.name));

        const recents: RecentDeckItem[] = grouped.map((g) => ({
            deckId: g._id.toString(),
            deckName: nameMap.get(g._id.toString()) || 'Untitled Deck',
            lastPlayedAt: g.lastPlayedAt,
        }));

        return { success: true, recents };
    } catch (err) {
        console.error('[Deck Insights] Failed to fetch recent decks', err);
        return { success: false, message: 'Failed to fetch recent decks.' };
    }
}

