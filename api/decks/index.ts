import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
import { sql } from '@vercel/postgres';
import { authenticate } from '../_utils/auth';
import type { Deck } from 'types/index';

dotenv.config();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('decks index');

    // --- GET /api/decks --- Fetch all decks
    if (req.method === 'GET') {
        try {
            const { rows: allDecks } = await sql<Deck>`SELECT * FROM decks ORDER BY created_at;`; // Use Deck type hint
            return res.status(200).json(allDecks);
        } catch (error) {
            console.error('Error fetching decks:', error);
            return res.status(500).json({ message: 'Failed to fetch decks' });
        }
    }

    // --- POST /api/decks --- Create a new deck
    if (req.method === 'POST') {
        // Check authentication
        const user = authenticate(req);
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { name } = req.body;

        // Validate input
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ message: 'Deck name is required and must be a non-empty string' });
        }

        const deckName = name.trim();

        try {
            // Use Deck type hint
            const { rows: newDecks } = await sql<Deck>`
                INSERT INTO decks (name)
                VALUES (${deckName})
                RETURNING *;
            `;
            if (!newDecks || newDecks.length === 0) {
                throw new Error('Deck creation failed in DB.');
            }
            return res.status(201).json(newDecks[0]); // Return the created deck
        } catch (error) {
            console.error('Error creating deck:', error);
            // TODO: Add more specific error handling (e.g., unique constraint violation)
            return res.status(500).json({ message: 'Failed to create deck' });
        }
    }

    // Handle other methods
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}