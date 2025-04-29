'use server';

import { ObjectId } from 'mongodb'; // Removed MongoClient
import { revalidatePath } from 'next/cache';
import type { Deck, DeckDocument, CardDocument } from '@/types';
import { connectToDatabase } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth'; // Import shared auth function
import { mapMongoId } from '@/lib/utils'; // Import shared helper


// --- Keep Specific Helper ---
function mapDeckDocument(doc: DeckDocument | null | undefined): Deck | null {
    const mapped = mapMongoId(doc); // Use imported helper
    // Add null check for mapped before casting
    if (!mapped) return null;
    return mapped as Deck; // Cast result to Deck (assuming Deck only needs id mapping)
}

// --- Deck CRUD Actions ---

export async function fetchDecksAction(): Promise<{ success: boolean; decks?: Deck[]; message?: string }> {
    try {
        const { db } = await connectToDatabase();
        const decksCollection = db.collection<DeckDocument>('decks');
        const decksArray = await decksCollection.find({}).sort({ createdAt: 1 }).toArray();
        const mappedDecks = decksArray.map(mapDeckDocument).filter((d): d is Deck => d !== null);
        return { success: true, decks: mappedDecks };
    } catch (error) {
        console.error('[Fetch Decks Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch decks';
        return { success: false, message };
    }
}

export async function fetchDeckByIdAction(deckId: string): Promise<{ success: boolean; deck?: Deck; message?: string }> {
    if (!deckId || !ObjectId.isValid(deckId)) {
        return { success: false, message: 'Valid Deck ID is required' };
    }
    try {
        const { db } = await connectToDatabase();
        const decksCollection = db.collection<DeckDocument>('decks');
        const deckDoc = await decksCollection.findOne({ _id: new ObjectId(deckId) });
        const mappedDeck = mapDeckDocument(deckDoc);

        if (!mappedDeck) {
            return { success: false, message: 'Deck not found' };
        }
        return { success: true, deck: mappedDeck };
    } catch (error) {
        console.error('[Fetch Deck By ID Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch deck';
        return { success: false, message };
    }
}

// Keep interface
interface DeckMutationResult {
    success: boolean;
    deck?: Deck;
    message?: string;
}

export async function createDeckAction(name: string, token: string | undefined): Promise<DeckMutationResult> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };

    if (!name || typeof name !== 'string' || name.trim() === '') {
        return { success: false, message: 'Deck name is required' };
    }
    const deckName = name.trim();
    try {
        const { db } = await connectToDatabase();
        const decksCollection = db.collection<DeckDocument>('decks');
        const newDeckData: Omit<DeckDocument, '_id'> = {
            name: deckName,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const result = await decksCollection.insertOne(newDeckData as DeckDocument);

        if (!result.insertedId) throw new Error('Deck creation failed');

        const createdDeckDoc = await decksCollection.findOne({ _id: result.insertedId });
        const mappedCreatedDeck = mapDeckDocument(createdDeckDoc);

        if (!mappedCreatedDeck) {
            throw new Error('Failed to map created deck.');
        }
        revalidatePath('/');
        return { success: true, deck: mappedCreatedDeck };
    } catch (error) {
        console.error('[Create Deck Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to create deck';
        return { success: false, message };
    }
}

export async function updateDeckAction(deckId: string, name: string, token: string | undefined): Promise<DeckMutationResult> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };

    if (!deckId || !ObjectId.isValid(deckId)) {
        return { success: false, message: 'Valid Deck ID is required' };
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return { success: false, message: 'Deck name is required' };
    }
    const deckName = name.trim();
    try {
        const { db } = await connectToDatabase();
        const decksCollection = db.collection<DeckDocument>('decks');
        const result = await decksCollection.findOneAndUpdate(
            { _id: new ObjectId(deckId) },
            { $set: { name: deckName, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );
        // Use the specific mapper
        const mappedUpdatedDeck = mapDeckDocument(result);

        if (!mappedUpdatedDeck) {
            return { success: false, message: 'Deck not found for update or mapping failed' };
        }
        revalidatePath('/');
        revalidatePath(`/deck/${deckId}/edit`);
        return { success: true, deck: mappedUpdatedDeck };
    } catch (error) {
        console.error('[Update Deck Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to update deck';
        return { success: false, message };
    }
}

export async function deleteDeckAction(deckId: string, token: string | undefined): Promise<{ success: boolean; message?: string }> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };

    if (!deckId || !ObjectId.isValid(deckId)) {
        return { success: false, message: 'Valid Deck ID is required' };
    }

    try {
        const { db } = await connectToDatabase();
        const decksCollection = db.collection<DeckDocument>('decks');
        // TODO: Consider deleting associated cards & review events here using a transaction
        const result = await decksCollection.deleteOne({ _id: new ObjectId(deckId) });

        if (result.deletedCount === 0) {
            return { success: false, message: 'Deck not found for deletion' };
        }

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('[Delete Deck Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to delete deck';
        return { success: false, message };
    }
}

// --- Import Deck Action ---
interface ImportCardData {
    front: string;
    back: string;
}

interface ImportDeckResult {
    success: boolean;
    deck?: Deck; // Return the created deck
    message?: string;
    errorDetails?: string[]; // For validation errors
}

export async function importDeckAction(
    deckName: string,
    cardsData: ImportCardData[],
    token: string | undefined
): Promise<ImportDeckResult> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };

    // --- Basic Validation ---
    if (!deckName || typeof deckName !== 'string' || deckName.trim() === '') {
        return { success: false, message: 'Deck name is required' };
    }
    if (!Array.isArray(cardsData) || cardsData.length === 0) {
        return { success: false, message: 'Card data must be a non-empty array' };
    }

    const validationErrors: string[] = [];
    const validCards: Omit<CardDocument, '_id' | 'deck_id' | 'createdAt' | 'updatedAt'>[] = [];

    cardsData.forEach((card, index) => {
        let hasError = false;
        if (!card.front || typeof card.front !== 'string' || card.front.trim() === '') {
            validationErrors.push(`Card ${index + 1}: 'front' text is missing or empty.`);
            hasError = true;
        }
        if (!card.back || typeof card.back !== 'string' || card.back.trim() === '') {
            validationErrors.push(`Card ${index + 1}: 'back' text is missing or empty.`);
            hasError = true;
        }
        if (!hasError) {
            validCards.push({ front_text: card.front.trim(), back_text: card.back.trim() });
        }
    });

    if (validationErrors.length > 0) {
        return { success: false, message: 'Invalid card data provided.', errorDetails: validationErrors };
    }
    // --- End Validation ---

    const trimmedDeckName = deckName.trim();

    try {
        const { db } = await connectToDatabase();
        const decksCollection = db.collection<DeckDocument>('decks');
        const cardsCollection = db.collection<CardDocument>('cards');

        // 1. Create the Deck
        const newDeckData: Omit<DeckDocument, '_id'> = {
            name: trimmedDeckName,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const deckInsertResult = await decksCollection.insertOne(newDeckData as DeckDocument);

        if (!deckInsertResult.insertedId) {
            throw new Error('Failed to create the deck document.');
        }
        const newDeckId = deckInsertResult.insertedId;

        // 2. Prepare and Insert Cards
        const cardDocumentsToInsert = validCards.map(card => ({
            ...card,
            deck_id: newDeckId, // Link to the new deck
            createdAt: new Date(),
            updatedAt: new Date(),
        }));

        if (cardDocumentsToInsert.length > 0) {
            const cardInsertResult = await cardsCollection.insertMany(cardDocumentsToInsert as CardDocument[]);
            if (!cardInsertResult.acknowledged || cardInsertResult.insertedCount !== cardDocumentsToInsert.length) {
                // Attempt to clean up the created deck if card insert fails
                console.warn(`Card insertion partially failed for deck ${newDeckId}. Attempting cleanup.`);
                await decksCollection.deleteOne({ _id: newDeckId });
                throw new Error('Failed to insert all card documents.');
            }
        }

        // 3. Fetch and return the created deck
        const createdDeckDoc = await decksCollection.findOne({ _id: newDeckId });
        const mappedCreatedDeck = mapDeckDocument(createdDeckDoc);

        if (!mappedCreatedDeck) {
            // Should not happen if insert succeeded, but good practice
            throw new Error('Failed to map created deck after successful insert.');
        }

        revalidatePath('/'); // Revalidate the home page deck list
        return { success: true, deck: mappedCreatedDeck };

    } catch (error) {
        console.error('[Import Deck Action Error]', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred during deck import';
        return { success: false, message };
    }
}