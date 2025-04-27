'use client'; // Mark as client component

import React, { useState } from 'react';
import Link from 'next/link'; // Use Next.js Link
import { z } from 'zod'; // Import Zod
import {
    useDecks, // Use the hook again
    useCreateDeckMutation,
    useDeleteDeckMutation,
    useImportDeckMutation, // Import the new hook
} from '@/hooks/queryHooks'; // Use path alias
import Button from '@/components/Button'; // Use path alias
import { useAuth } from './context/useAuth';
// Import shared type
import type { Deck } from '@/types';

// Zod schema for validating the JSON (an array of card objects)
const cardImportSchema = z.array(
    z.object({
        front: z.string().trim().min(1, { message: 'Card front text cannot be empty' }),
        back: z.string().trim().min(1, { message: 'Card back text cannot be empty' }),
    })
).min(1, { message: 'Imported JSON must contain at least one card' });

// Type for the validated array of card data
type ValidatedImportData = z.infer<typeof cardImportSchema>;

interface ImportDeckModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (deckName: string, cardsData: ValidatedImportData) => void;
    isLoading: boolean;
}

function ImportDeckModal({ isOpen, onClose, onSubmit, isLoading }: ImportDeckModalProps) {
    const [deckName, setDeckName] = useState('');
    const [jsonInput, setJsonInput] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setJsonInput(e.target.value);
        setValidationError(null); // Clear error on change
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        if (!deckName.trim()) {
            setValidationError('Deck name is required.');
            return;
        }

        let parsedData;
        try {
            parsedData = JSON.parse(jsonInput);
        } catch {
            setValidationError('Invalid JSON format. Please check your input.');
            return;
        }

        // Validate using Zod - Use cardImportSchema as value here
        const validationResult = cardImportSchema.safeParse(parsedData);

        if (!validationResult.success) {
            const formattedErrors = validationResult.error.errors.map(err => {
                const path = err.path.join('.');
                // Improve error message slightly
                return `${path ? `Card[${path}]: ` : ''}${err.message}`;
            }).join('\n');
            setValidationError(`JSON validation failed:\n${formattedErrors}`);
            return;
        }

        // Submit the validated array (validationResult.data)
        onSubmit(deckName.trim(), validationResult.data);
    };

    // Clear form on close
    const handleClose = () => {
        setDeckName('');
        setJsonInput('');
        setValidationError(null);
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Import New Deck</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Deck Name Input */}
                    <div>
                        <label htmlFor="import-deck-name" className="block text-sm font-medium text-gray-700 mb-1">New Deck Name</label>
                        <input
                            id="import-deck-name"
                            type="text"
                            value={deckName}
                            onChange={(e) => setDeckName(e.target.value)}
                            placeholder="Enter name for the imported deck..."
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                            disabled={isLoading}
                        />
                    </div>
                    {/* JSON Input Textarea */}
                    <div>
                        <label htmlFor="import-json-data" className="block text-sm font-medium text-gray-700 mb-1">Paste Card JSON Here</label>
                        <textarea
                            id="import-json-data"
                            rows={10}
                            value={jsonInput}
                            onChange={handleJsonChange}
                            placeholder='[
  {
    "front": "Example Front 1",
    "back": "Example Back 1"
  },
  {
    "front": "Example Front 2",
    "back": "Example Back 2"
  }
]'
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary font-mono text-sm"
                            disabled={isLoading}
                        />
                        {validationError && (
                            <p className="text-sm text-red-600 mt-1 whitespace-pre-wrap">{validationError}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Expected format: An array of objects, each with non-empty "front" and "back" string properties.
                            {/* Link to markdown file - assuming it's served or accessible */}
                            {/* If not served, remove the link */}
                            See <a href="/deck-import-format.md" target="_blank" rel="noopener noreferrer" className="underline text-primary">format details</a>.
                        </p>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="default" onClick={handleClose} disabled={isLoading}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={isLoading || !deckName.trim() || !jsonInput.trim()}>
                            {isLoading ? 'Importing...' : 'Import Deck'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Renamed component to follow Next.js conventions (PascalCase)
export default function HomePage() {
    // Use the real hook for fetching
    const { data: decks, isLoading: decksLoading, error: decksError } = useDecks();
    const createDeckMutation = useCreateDeckMutation();
    const deleteDeckMutation = useDeleteDeckMutation();
    const importDeckMutation = useImportDeckMutation(); // Use the import hook
    const { token } = useAuth();

    const [newDeckName, setNewDeckName] = useState('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false); // State for modal

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

    // Handler for import submission
    const handleImportDeckSubmit = (deckName: string, cardsData: ValidatedImportData) => {
        if (!token) return;

        importDeckMutation.mutate({ deckName, cardsData, token }, {
            onSuccess: (newDeck) => {
                setIsImportModalOpen(false); // Close modal on success
                alert(`Deck "${newDeck.name}" imported successfully!`);
                // Query invalidation handled by the hook
            },
            onError: (err) => {
                console.error("Failed to import deck:", err);
                // Display the error from the mutation hook (which includes validation details)
                alert(`Failed to import deck: ${err.message}`);
            }
        });
    };

    const isLoading = decksLoading || createDeckMutation.isPending || deleteDeckMutation.isPending || importDeckMutation.isPending;
    const error = decksError || createDeckMutation.error || deleteDeckMutation.error || importDeckMutation.error;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-primary">My Decks</h1>

            {/* Action Buttons */}
            {token && (
                <div className="flex space-x-2">
                    {/* Button to open import modal */}
                    <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} disabled={isLoading}>
                        Import Deck from JSON
                    </Button>
                </div>
            )}

            {/* Create New Deck Form */}
            {token && (
                <form onSubmit={handleCreateDeck} className="flex space-x-2 items-end p-4 bg-gray-100 rounded shadow">
                    <div className="flex-grow">
                        <label htmlFor="new-deck-name" className="block text-sm font-medium text-gray-700 mb-1">New Deck Name</label>
                        <input
                            id="new-deck-name"
                            type="text"
                            value={newDeckName}
                            onChange={(e) => setNewDeckName(e.target.value)}
                            placeholder="Enter deck name..."
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
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
                <p className="text-center text-gray-500">Please <Link href="/login" className="text-primary underline">login</Link> to create or manage decks.</p>
            )}

            {/* Deck List - Use real loading/error states */}
            {decksLoading && <div className="text-center text-gray-500">Loading decks...</div>}
            {error && <div className="text-center text-red-500">Error loading data: {error.message || 'Unknown error'}</div>}
            {!decksLoading && !error && decks && (
                <ul className="space-y-3">
                    {decks.map((deck: Deck) => (
                        <li
                            key={deck.id}
                            className="flex items-center justify-between p-4 bg-white rounded shadow"
                        >
                            <span className="font-medium text-lg text-gray-900">{deck.name}</span>
                            <div className="space-x-2">
                                {/* Update Play link to point to /options */}
                                <Link href={`/deck/${deck.id}/options`} passHref legacyBehavior><Button as="a" variant="secondary" size="sm">Play</Button></Link>
                                <Link href={`/deck/${deck.id}/edit`} passHref legacyBehavior><Button as="a" variant="default" size="sm">Edit</Button></Link>
                                {token && (
                                    <Button
                                        onClick={() => handleDeleteDeck(deck.id)}
                                        variant="primary"
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
                        <p className="text-center text-gray-500">No decks found. {token ? 'Create one above!' : 'Login to create decks.'}</p>
                    )}
                </ul>
            )}

            {/* Render the Import Deck Modal */}
            <ImportDeckModal
                isOpen={isImportModalOpen} // Use state variable
                onClose={() => setIsImportModalOpen(false)} // Use state setter
                onSubmit={handleImportDeckSubmit} // Use handler
                isLoading={importDeckMutation.isPending}
            />
        </div>
    );
}