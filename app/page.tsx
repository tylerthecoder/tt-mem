'use client'; // Mark as client component

import React, { useState } from 'react';
import Link from 'next/link'; // Use Next.js Link
import {
    useDecks, // Use the hook again
    useCreateDeckMutation,
    useDeleteDeckMutation,
} from '@/hooks/queryHooks'; // Use path alias
import Button from '@/components/Button'; // Use path alias
import { useAuth } from '@/context/AuthContext'; // Use path alias


// Inline Deck type (mirroring definition in queryHooks for now)
interface Deck {
    id: string;
    name: string;
    created_at?: string;
    updated_at?: string;
}

// Renamed component to follow Next.js conventions (PascalCase)
export default function HomePage() {
    // Use the real hook for fetching
    const { data: decks, isLoading, error } = useDecks();
    const createDeckMutation = useCreateDeckMutation();
    const deleteDeckMutation = useDeleteDeckMutation();
    const { token } = useAuth();

    const [newDeckName, setNewDeckName] = useState('');

    const handleCreateDeck = (event: React.FormEvent) => {
        event.preventDefault();
        if (!newDeckName.trim() || !token) return;
        // Pass token to the mutation variables
        createDeckMutation.mutate(
            { name: newDeckName.trim(), token },
            {
                onSuccess: () => {
                    setNewDeckName('');
                },
                onError: (err) => {
                    console.error("Failed to create deck:", err);
                    alert(`Failed to create deck: ${err.message}`);
                }
            }
        );
    };

    const handleDeleteDeck = (deckId: string) => {
        if (!token) return;
        if (window.confirm('Are you sure you want to delete this deck?')) {
            // Pass token to the mutation variables
            deleteDeckMutation.mutate({ deckId, token }, {
                onError: (err) => {
                    console.error("Failed to delete deck:", err);
                    alert(`Failed to delete deck: ${err.message}`);
                }
            });
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-primary">My Decks</h1>

            {/* Create New Deck Form */}
            {token && (
                <form onSubmit={handleCreateDeck} className="flex space-x-2 items-end p-4 bg-gray-100 dark:bg-gray-800 rounded shadow">
                    <div className="flex-grow">
                        <label htmlFor="new-deck-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Deck Name</label>
                        <input
                            id="new-deck-name"
                            type="text"
                            value={newDeckName}
                            onChange={(e) => setNewDeckName(e.target.value)}
                            placeholder="Enter deck name..."
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            disabled={createDeckMutation.isPending}
                        />
                    </div>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={createDeckMutation.isPending || !newDeckName.trim()}
                    >
                        {createDeckMutation.isPending ? 'Creating...' : 'Create Deck'}
                    </Button>
                </form>
            )}
            {!token && (
                <p className="text-center text-gray-500 dark:text-gray-400">Please <Link href="/login" className="text-primary underline">login</Link> to create or manage decks.</p>
            )}

            {/* Deck List - Use real loading/error states */}
            {isLoading && <div className="text-center text-gray-500 dark:text-gray-400">Loading decks...</div>}
            {error && <div className="text-center text-red-500 dark:text-red-400">Error loading decks: {error.message || 'Unknown error'}</div>}
            {!isLoading && !error && decks && (
                <ul className="space-y-3">
                    {decks.map((deck: Deck) => (
                        <li
                            key={deck.id}
                            className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded shadow"
                        >
                            <span className="font-medium text-lg">{deck.name}</span>
                            <div className="space-x-2">
                                {/* Use Next.js Link with href */}
                                <Link href={`/deck/${deck.id}/play`} passHref legacyBehavior><Button as="a" variant="secondary" size="sm">Play</Button></Link>
                                <Link href={`/deck/${deck.id}/edit`} passHref legacyBehavior><Button as="a" variant="default" size="sm">Edit</Button></Link>
                                {token && (
                                    <Button
                                        onClick={() => handleDeleteDeck(deck.id)}
                                        variant="primary" // Consider a 'danger' variant
                                        size="sm"
                                        disabled={deleteDeckMutation.isPending && deleteDeckMutation.variables?.deckId === deck.id}
                                    >
                                        {(deleteDeckMutation.isPending && deleteDeckMutation.variables?.deckId === deck.id) ? 'Deleting...' : 'Delete'}
                                    </Button>
                                )}
                            </div>
                        </li>
                    ))}
                    {decks.length === 0 && (
                        <p className="text-center text-gray-500 dark:text-gray-400">No decks found. {token ? 'Create one above!' : 'Login to create decks.'}</p>
                    )}
                </ul>
            )}
        </div>
    );
}