import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    useDecks,
    useCreateDeckMutation,
    useDeleteDeckMutation,
} from '../hooks/queryHooks';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext'; // Needed to check if logged in for mutations

// Inline Deck type (until imports are fixed)
interface Deck {
    id: string;
    name: string;
    created_at?: string;
    updated_at?: string;
}

const HomePage: React.FC = () => {
    const { data: decks, isLoading, error } = useDecks(); // Use the hook to fetch decks
    const createDeckMutation = useCreateDeckMutation();
    const deleteDeckMutation = useDeleteDeckMutation();
    const { token } = useAuth(); // Get token to conditionally render/enable actions

    const [newDeckName, setNewDeckName] = useState('');

    const handleCreateDeck = (event: React.FormEvent) => {
        event.preventDefault();
        if (!newDeckName.trim() || !token) return; // Need auth and name
        createDeckMutation.mutate(
            { name: newDeckName.trim() },
            {
                onSuccess: () => {
                    setNewDeckName(''); // Clear input on success
                    // Optionally add user feedback
                },
                onError: (err) => {
                    console.error("Failed to create deck:", err);
                    alert(`Failed to create deck: ${err.message}`);
                }
            }
        );
    };

    const handleDeleteDeck = (deckId: string) => {
        if (!token) return; // Need auth
        if (window.confirm('Are you sure you want to delete this deck?')) {
            deleteDeckMutation.mutate({ deckId }, {
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

            {/* Create New Deck Form (Only show/enable if logged in) */}
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
                <p className="text-center text-gray-500 dark:text-gray-400">Please <Link to="/login" className="text-primary underline">login</Link> to create or manage decks.</p>
            )}

            {/* Deck List */}
            {isLoading && <div className="text-center text-gray-500 dark:text-gray-400">Loading decks...</div>}
            {error && <div className="text-center text-red-500 dark:text-red-400">Error loading decks: {error.message}</div>}
            {!isLoading && !error && decks && (
                <ul className="space-y-3">
                    {decks.map((deck: Deck) => ( // Add type annotation
                        <li
                            key={deck.id}
                            className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded shadow"
                        >
                            <span className="font-medium text-lg">{deck.name}</span>
                            <div className="space-x-2">
                                <Link to={`/deck/${deck.id}/play`} className="px-3 py-1 rounded text-sm transition-colors bg-secondary text-white hover:bg-green-700">Play</Link>
                                <Link to={`/deck/${deck.id}/edit`} className="px-3 py-1 rounded text-sm transition-colors bg-gray-500 text-white hover:bg-gray-600">Edit</Link>
                                {token && ( // Only show delete if logged in
                                    <Button
                                        onClick={() => handleDeleteDeck(deck.id)}
                                        variant="primary" // Use primary red for delete? Consider a 'danger' variant
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
};

export default HomePage;