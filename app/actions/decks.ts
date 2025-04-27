'use server';

import { ObjectId } from 'mongodb'; // Removed MongoClient
// import jwt from 'jsonwebtoken'; // Removed
import { revalidatePath } from 'next/cache';
// Import shared types
// Remove unused JwtPayload import
import type { Deck, DeckDocument /*, JwtPayload */ } from '@/types';
import { connectToDatabase } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth'; // Import shared auth function
import { mapMongoId } from '@/lib/utils'; // Import shared helper

// --- Remove Authentication Helper ---
// function verifyAuthToken(token: string | undefined): JwtPayload | null { ... } // Removed

// --- Remove Generic Helper ---
// function mapMongoId<T extends { _id?: ObjectId }>(...) { ... } // Removed

// --- Keep Specific Helper ---
function mapDeckDocument(doc: DeckDocument | null | undefined): Deck | null {
    const mapped = mapMongoId(doc); // Use imported helper
    // Add null check for mapped before casting
    if (!mapped) return null;
    return mapped as Deck; // Cast result to Deck (assuming Deck only needs id mapping)
}

// --- Deck CRUD Actions (MongoDB Version) ---

export async function fetchDecksAction(): Promise<{ success: boolean; decks?: Deck[]; message?: string }> {
    try {
        const { db } = await connectToDatabase();
        const decksCollection = db.collection<DeckDocument>('decks');
        const decksArray = await decksCollection.find({}).sort({ createdAt: 1 }).toArray();
        const mappedDecks = decksArray.map(mapDeckDocument).filter((d): d is Deck => d !== null);
        return { success: true, decks: mappedDecks };
    } catch (error) {
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
        // TODO: Add logic to delete associated cards first if necessary
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