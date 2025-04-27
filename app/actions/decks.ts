'use server';

import jwt from 'jsonwebtoken';
import { revalidatePath } from 'next/cache'; // To update cache after mutations
import { db, postgresConnectionString, sql } from '@/db';

// --- Types (Should match shared types if imports worked) ---
interface Deck {
    id: string;
    name: string;
    created_at?: string;
    updated_at?: string;
}

interface JwtPayload {
    user: string;
    iat?: number;
    exp?: number;
}

// --- Authentication Helper ---
// This helper verifies the JWT. In real Server Actions, auth is often handled
// by middleware or checking cookies/headers directly. This JWT check is illustrative.
function verifyAuthToken(token: string | undefined): JwtPayload | null {
    if (!token) return null;
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error('JWT_SECRET environment variable not set.');
        // Don't throw error here, just fail auth check
        return null;
    }
    try {
        const decoded = jwt.verify(token, jwtSecret);
        return decoded as JwtPayload;
    } catch (error) {
        console.error('JWT verification failed in action:', error);
        return null;
    }
}

// --- Deck CRUD Actions ---

// Note: Fetching actions might not be ideal here if data can be fetched directly
// in Server Components. Included for completeness if called from Client Components.
export async function fetchDecksAction(): Promise<{ success: boolean; decks?: Deck[]; message?: string }> {
    try {
        const pooledConnectionString = postgresConnectionString('pool');
        console.log(pooledConnectionString);

        const client = await db.connect();
        console.log(client);

    } catch (error) {
        console.error('[Fetch Decks Action Error]', error);
    }



    try {
        const { rows } = await sql<Deck>`SELECT * FROM decks ORDER BY created_at;`;
        return { success: true, decks: rows };
    } catch (error) {
        console.error('[Fetch Decks Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch decks';
        return { success: false, message };
    }
}

export async function fetchDeckByIdAction(deckId: string): Promise<{ success: boolean; deck?: Deck; message?: string }> {
    if (!deckId) return { success: false, message: 'Deck ID is required' };
    try {
        const { rows } = await sql<Deck>`SELECT * FROM decks WHERE id = ${deckId} LIMIT 1;`;
        if (rows.length === 0) {
            return { success: false, message: 'Deck not found' };
        }
        return { success: true, deck: rows[0] };
    } catch (error) {
        console.error('[Fetch Deck By ID Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch deck';
        return { success: false, message };
    }
}


interface DeckMutationResult {
    success: boolean;
    deck?: Deck; // Returned on create/update
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
        const { rows } = await sql<Deck>`
            INSERT INTO decks (name) VALUES (${deckName}) RETURNING *;
        `;
        if (!rows || rows.length === 0) {
            throw new Error('Deck creation failed in DB.');
        }
        revalidatePath('/'); // Revalidate home page cache
        return { success: true, deck: rows[0] };
    } catch (error) {
        console.error('[Create Deck Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to create deck';
        return { success: false, message };
    }
}

export async function updateDeckAction(deckId: string, name: string, token: string | undefined): Promise<DeckMutationResult> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };

    if (!deckId) return { success: false, message: 'Deck ID is required' };
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return { success: false, message: 'Deck name is required' };
    }
    const deckName = name.trim();

    try {
        const { rows } = await sql<Deck>`
            UPDATE decks SET name = ${deckName}, updated_at = NOW() WHERE id = ${deckId} RETURNING *;
        `;
        if (!rows || rows.length === 0) {
            return { success: false, message: 'Deck not found for update' };
        }
        revalidatePath('/'); // Revalidate home page
        revalidatePath(`/deck/${deckId}/edit`); // Revalidate edit page
        return { success: true, deck: rows[0] };
    } catch (error) {
        console.error('[Update Deck Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to update deck';
        return { success: false, message };
    }
}

export async function deleteDeckAction(deckId: string, token: string | undefined): Promise<{ success: boolean; message?: string }> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };

    if (!deckId) return { success: false, message: 'Deck ID is required' };

    try {
        const { rowCount } = await sql`DELETE FROM decks WHERE id = ${deckId};`;
        if (rowCount === 0) {
            return { success: false, message: 'Deck not found for deletion' };
        }
        revalidatePath('/'); // Revalidate home page
        return { success: true };
    } catch (error) {
        console.error('[Delete Deck Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to delete deck';
        // TODO: Handle foreign key constraints if cards exist
        return { success: false, message };
    }
}