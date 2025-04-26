import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
import { sql } from '@vercel/postgres'; // Import sql
import { authenticate } from '../../_utils/auth'; // Relative path within /api is okay
import type { Deck } from 'types/index'; // Use absolute path from baseUrl
// Removed Drizzle imports

// Removed local Deck interface definition

dotenv.config();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { deckId } = req.query;

    if (!deckId || typeof deckId !== 'string') {
        return res.status(400).json({ message: 'Valid Deck ID is required' });
    }

    // --- GET /api/decks/{deckId} --- Fetch a single deck
    if (req.method === 'GET') {
        try {
            const { rows: decksFound } = await sql<Deck>`
                SELECT * FROM decks WHERE id = ${deckId} LIMIT 1;
            `;

            if (!decksFound || decksFound.length === 0) {
                return res.status(404).json({ message: 'Deck not found' });
            }
            return res.status(200).json(decksFound[0]);
        } catch (error) {
            console.error(`Error fetching deck ${deckId}:`, error);
            return res.status(500).json({ message: 'Failed to fetch deck' });
        }
    }

    // --- PUT /api/decks/{deckId} --- Update a deck (e.g., rename)
    if (req.method === 'PUT' || req.method === 'PATCH') {
        const user = authenticate(req);
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { name } = req.body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ message: 'Deck name is required for update' });
        }
        const deckName = name.trim();

        try {
            const { rows: updatedDecks } = await sql<Deck>`
                UPDATE decks
                SET name = ${deckName}, updated_at = NOW()
                WHERE id = ${deckId}
                RETURNING *;
            `;

            if (!updatedDecks || updatedDecks.length === 0) {
                // Could be 404 if the ID didn't exist, or 500 if the update failed unexpectedly
                return res.status(404).json({ message: 'Deck not found for update' });
            }
            return res.status(200).json(updatedDecks[0]);
        } catch (error) {
            console.error(`Error updating deck ${deckId}:`, error);
            return res.status(500).json({ message: 'Failed to update deck' });
        }
    }

    // --- DELETE /api/decks/{deckId} --- Delete a deck
    if (req.method === 'DELETE') {
        const user = authenticate(req);
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        try {
            const { rowCount } = await sql`
                DELETE FROM decks
                WHERE id = ${deckId};
            `;

            if (rowCount === 0) {
                // If no rows were deleted, the deck ID likely didn't exist
                return res.status(404).json({ message: 'Deck not found for deletion' });
            }
            // Successfully deleted
            return res.status(204).end(); // 204 No Content is standard for successful DELETE
        } catch (error) {
            console.error(`Error deleting deck ${deckId}:`, error);
            // TODO: Handle potential foreign key constraint errors if cards depend on decks
            return res.status(500).json({ message: 'Failed to delete deck' });
        }
    }

    res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']); // Add DELETE to allowed methods
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}