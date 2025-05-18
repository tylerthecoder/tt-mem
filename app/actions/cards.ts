'use server';

import { ObjectId, Filter, Document } from 'mongodb';
import { revalidatePath } from 'next/cache';
import type { Card, CardDocument, ReviewEventDocument, DeckDocument } from '@/types';
import { ReviewResult } from '@/types'; // Import enum value
// import jwt from 'jsonwebtoken'; // Removed
import { connectToDatabase } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth'; // Import shared auth function
import { mapMongoId } from '@/lib/utils'; // Import shared helper

// --- Remove Auth Helper ---
// function verifyAuthToken(token: string | undefined): JwtPayload | null { ... } // Removed

// --- Remove Generic Helper ---
// function mapMongoId<T extends { _id?: ObjectId }>(...) { ... } // Removed

// --- Keep Specific Helper ---
function mapCardDocument(doc: CardDocument | null | undefined): Card | null {
    const mapped = mapMongoId(doc); // Use imported helper
    if (mapped && mapped.deck_id instanceof ObjectId) {
        return {
            ...mapped,
            deck_id: mapped.deck_id.toString(),
        } as Card;
    }
    // Handle cases where mapping fails or deck_id isn't ObjectId (shouldn't happen with proper types)
    return null;
}

// --- Card Actions ---

interface CreateCardResult {
    success: boolean;
    card?: Card; // Use shared Card type
    message?: string;
}

interface CreateCardInput {
    deckId: string;
    frontText: string;
    backText: string;
    token: string | undefined;
}

export async function createCardAction(input: CreateCardInput): Promise<CreateCardResult> {
    const { deckId, frontText, backText, token } = input;

    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };

    if (!deckId || !ObjectId.isValid(deckId)) {
        return { success: false, message: 'Valid Deck ID is required' };
    }
    if (!frontText || !frontText.trim()) {
        return { success: false, message: 'Front text cannot be empty' };
    }
    if (!backText || !backText.trim()) {
        return { success: false, message: 'Back text cannot be empty' };
    }

    // No client variable needed
    try {
        const { db } = await connectToDatabase(); // Use imported function
        const cardsCollection = db.collection<CardDocument>('cards');

        const newCardData: Omit<CardDocument, '_id'> = {
            deck_id: new ObjectId(deckId),
            front_text: frontText.trim(),
            back_text: backText.trim(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await cardsCollection.insertOne(newCardData as CardDocument);

        if (!result.insertedId) {
            throw new Error('Card creation failed in DB.');
        }

        const createdCardDoc = await cardsCollection.findOne({ _id: result.insertedId });
        // Use specific card mapper
        const mappedCreatedCard = mapCardDocument(createdCardDoc);

        if (!mappedCreatedCard) {
            throw new Error('Failed to map created card.');
        }

        // No client.close() needed
        revalidatePath(`/deck/${deckId}/edit`);
        return { success: true, card: mappedCreatedCard }; // Already type Card

    } catch (error) {
        console.error('[Create Card Action Error]', error);
        // No client?.close() needed
        const message = error instanceof Error ? error.message : 'Failed to create card';
        return { success: false, message };
    }
}

// --- Fetch Single Card ---
interface FetchCardResult {
    success: boolean;
    card?: Card; // Use shared Card type
    message?: string;
}

export async function getCardAction(cardId: string, token: string | undefined): Promise<FetchCardResult> {
    const payload = verifyAuthToken(token);
    // We don't have the user ID on the card, so we check deck ownership
    if (!payload) return { success: false, message: 'Unauthorized' };

    if (!cardId || !ObjectId.isValid(cardId)) {
        return { success: false, message: 'Valid Card ID is required' };
    }

    try {
        const { db } = await connectToDatabase();
        const cardsCollection = db.collection<CardDocument>('cards');
        const decksCollection = db.collection<DeckDocument>('decks');

        const cardDoc = await cardsCollection.findOne({ _id: new ObjectId(cardId) });

        if (!cardDoc) {
            return { success: false, message: 'Card not found' };
        }

        // Verify deck ownership
        const deckDoc = await decksCollection.findOne({ _id: cardDoc.deck_id });
        if (!deckDoc) {
            // This case implies data inconsistency (card exists, deck doesn't)
            console.error(`Data inconsistency: Card ${cardId} found, but its deck ${cardDoc.deck_id.toString()} does not exist.`);
            return { success: false, message: 'Associated deck not found.' };
        }

        // Note: We assume decks have an ownerId. Adjust if schema is different.
        // This check is hypothetical based on common patterns.
        // If decks don't have owner info, auth needs rethinking for single card fetch.
        // const deckOwnerId = deckDoc.ownerId?.toString(); // Assuming ownerId field exists
        // if (deckOwnerId !== payload.userId) { // Assuming userId is in payload
        //    return { success: false, message: 'Unauthorized: Cannot access card from this deck' };
        // }
        // --- TEMPORARY: Skipping owner check until Deck schema confirmed ---
        // --- If auth fails here, revisit deck schema and JWT payload ---

        const mappedCard = mapCardDocument(cardDoc);
        if (!mappedCard) {
            // This should ideally not happen if cardDoc was found
            return { success: false, message: 'Failed to map card data.' };
        }

        return { success: true, card: mappedCard };

    } catch (error) {
        console.error('[Fetch Single Card Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch card';
        return { success: false, message };
    }
}

// --- Fetch Cards for a Deck ---
interface FetchCardsResult {
    success: boolean;
    cards?: Card[]; // Use shared Card type
    message?: string;
}

export async function fetchDeckCardsAction(deckId: string): Promise<FetchCardsResult> {
    if (!deckId || !ObjectId.isValid(deckId)) {
        return { success: false, message: 'Valid Deck ID is required' };
    }

    try {
        const { db } = await connectToDatabase();
        const cardsCollection = db.collection<CardDocument>('cards');

        const cardDocs = await cardsCollection.find({ deck_id: new ObjectId(deckId) }).sort({ createdAt: 1 }).toArray();
        const mappedCards = cardDocs.map(mapCardDocument).filter((c): c is Card => c !== null);

        return { success: true, cards: mappedCards };

    } catch (error) {
        console.error('[Fetch Deck Cards Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch cards for deck';
        return { success: false, message };
    }
}

// --- Fetch Cards For Review (Multiple Decks or Single) ---
interface FetchReviewCardsResult {
    success: boolean;
    cards?: Card[];
    message?: string;
}

interface GetCardsForReviewParams {
    token: string | undefined;
    deckId?: string;
    deckIds?: string[];
    limit: number;
    strategy: 'random' | 'missedFirst';
}

export async function getCardsForReviewAction({
    token,
    deckId,
    deckIds,
    limit,
    strategy
}: GetCardsForReviewParams): Promise<FetchReviewCardsResult> {
    const user = verifyAuthToken(token);
    if (!user) {
        return { success: false, message: 'Unauthorized' };
    }

    const { db } = await connectToDatabase();
    const cardsCollection = db.collection<CardDocument>('cards');
    const reviewEventsCollection = db.collection<ReviewEventDocument>('review_events');

    let pipeline: any[] = [];
    const matchStage: Filter<CardDocument> = {};

    if (deckIds && deckIds.length > 0) {
        matchStage.deck_id = { $in: deckIds.map(id => new ObjectId(id)) };
    } else if (deckId) {
        matchStage.deck_id = new ObjectId(deckId);
    } else {
        // No deckId or deckIds: fetch from all decks (current behavior if not specified)
        // This section remains as is, assuming global fetch if no specific deck IDs are given.
        // User-specific filtering would typically happen here if decks had an owner_id related to `user.id`
    }

    if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
    }

    if (strategy === 'random') {
        pipeline.push({ $sample: { size: limit } });
    } else if (strategy === 'missedFirst') {
        pipeline.push(
            {
                $lookup: {
                    from: 'review_events',
                    localField: '_id',
                    foreignField: 'card_id',
                    as: 'reviews'
                }
            },
            {
                $addFields: {
                    lastReviewSort: { $sortArray: { input: "$reviews", sortBy: { timestamp: -1 } } },
                }
            },
            {
                $addFields: {
                    latestReviewDetails: { $first: "$lastReviewSort" }
                }
            },
            {
                $match: {
                    $or: [
                        { latestReviewDetails: { $exists: false } },
                        { "latestReviewDetails.result": ReviewResult.MISSED }
                    ]
                }
            },
            { $sample: { size: limit } }
        );
    } else {
        pipeline.push({ $sample: { size: limit } });
    }

    try {
        const cardDocs = await cardsCollection.aggregate(pipeline).toArray();
        const mappedCards = cardDocs.map(doc => mapCardDocument(doc as CardDocument)).filter((c): c is Card => c !== null);
        return { success: true, cards: mappedCards };

    } catch (error) {
        console.error('[Get Cards For Review Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch cards for review.';
        return { success: false, message };
    }
}

// --- Update Card ---
interface UpdateCardResult {
    success: boolean;
    card?: Card;
    message?: string;
}

interface UpdateCardInput {
    cardId: string;
    deckId: string; // Needed for revalidation
    frontText?: string;
    backText?: string;
    token: string | undefined;
}

export async function updateCardAction(input: UpdateCardInput): Promise<UpdateCardResult> {
    const { cardId, deckId, frontText, backText, token } = input;

    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };

    if (!cardId || !ObjectId.isValid(cardId) || !deckId || !ObjectId.isValid(deckId)) {
        return { success: false, message: 'Valid Card ID and Deck ID are required' };
    }
    if ((!frontText || !frontText.trim()) && (!backText || !backText.trim())) {
        return { success: false, message: 'At least one field (front or back text) must be provided for update' };
    }

    const updates: Partial<Pick<CardDocument, 'front_text' | 'back_text' | 'updatedAt'>> = {
        updatedAt: new Date(),
    };
    if (frontText && frontText.trim()) updates.front_text = frontText.trim();
    if (backText && backText.trim()) updates.back_text = backText.trim();

    try {
        const { db } = await connectToDatabase();
        const cardsCollection = db.collection<CardDocument>('cards');

        const result = await cardsCollection.findOneAndUpdate(
            { _id: new ObjectId(cardId), deck_id: new ObjectId(deckId) }, // Ensure card belongs to the deck
            { $set: updates },
            { returnDocument: 'after' }
        );

        const mappedUpdatedCard = mapCardDocument(result);

        if (!mappedUpdatedCard) {
            return { success: false, message: 'Card not found for update or update failed' };
        }

        revalidatePath(`/deck/${deckId}/edit`);
        return { success: true, card: mappedUpdatedCard };

    } catch (error) {
        console.error('[Update Card Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to update card';
        return { success: false, message };
    }
}

// --- Delete Card ---
interface DeleteCardResult {
    success: boolean;
    message?: string;
}

interface DeleteCardInput {
    cardId: string;
    deckId: string; // Needed for revalidation and verification
    token: string | undefined;
}

export async function deleteCardAction(input: DeleteCardInput): Promise<DeleteCardResult> {
    const { cardId, deckId, token } = input;

    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };

    if (!cardId || !ObjectId.isValid(cardId) || !deckId || !ObjectId.isValid(deckId)) {
        return { success: false, message: 'Valid Card ID and Deck ID are required' };
    }

    try {
        const { db } = await connectToDatabase();
        const cardsCollection = db.collection<CardDocument>('cards');
        const reviewsCollection = db.collection<ReviewEventDocument>('review_events');

        // TODO: Use a transaction to ensure atomicity
        // 1. Delete associated review events
        await reviewsCollection.deleteMany({ card_id: new ObjectId(cardId) });

        // 2. Delete the card itself
        const result = await cardsCollection.deleteOne({ _id: new ObjectId(cardId), deck_id: new ObjectId(deckId) });

        if (result.deletedCount === 0) {
            // This might happen if the card was deleted between the review deletion and card deletion
            // Or if the card didn't belong to the deck (though validation should prevent this)
            console.warn(`Card ${cardId} not found for deletion in deck ${deckId}, but associated reviews might have been deleted.`);
            return { success: false, message: 'Card not found or does not belong to the specified deck' };
        }

        revalidatePath(`/deck/${deckId}/edit`);
        return { success: true };

    } catch (error) {
        console.error('[Delete Card Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to delete card';
        return { success: false, message };
    }
}

// --- Create Review Event ---
interface CreateReviewEventResult {
    success: boolean;
    reviewEventId?: string; // Return the ID of the created event
    message?: string;
}

interface CreateReviewEventInput {
    cardId: string;
    deckId: string; // Might be useful for context/validation
    result: ReviewResult;
    // No token needed if we decide reviews are public/unauthenticated
    // Add token if reviews should be tied to a logged-in user
}

export async function createReviewEventAction(input: CreateReviewEventInput): Promise<CreateReviewEventResult> {
    const { cardId, deckId, result } = input;

    // Validate input
    if (!cardId || !ObjectId.isValid(cardId)) {
        return { success: false, message: 'Valid Card ID is required' };
    }
    if (!deckId || !ObjectId.isValid(deckId)) {
        // Optional: Could fetch card to verify deckId association
        return { success: false, message: 'Valid Deck ID is required' };
    }
    // Check if result is a valid enum value
    if (!Object.values(ReviewResult).includes(result)) {
        return { success: false, message: 'Invalid review result value' };
    }

    // TODO: Add auth check here if reviews require login
    // const user = verifyAuthToken(token);
    // if (!user) return { success: false, message: 'Unauthorized' };

    try {
        const { db } = await connectToDatabase();
        const reviewsCollection = db.collection<ReviewEventDocument>('review_events'); // Use a separate collection

        const newReviewEventData: Omit<ReviewEventDocument, '_id'> = {
            card_id: new ObjectId(cardId),
            // deck_id: new ObjectId(deckId), // Optionally store deck_id too
            result: result,
            timestamp: new Date(), // Use server timestamp
        };

        const dbResult = await reviewsCollection.insertOne(newReviewEventData as ReviewEventDocument);

        if (!dbResult.insertedId) {
            throw new Error('Review event creation failed in DB.');
        }

        // No revalidation needed typically for review events unless displaying history
        // revalidatePath(...)

        return { success: true, reviewEventId: dbResult.insertedId.toString() };

    } catch (error) {
        console.error('[Create Review Event Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to record review event';
        return { success: false, message };
    }
}