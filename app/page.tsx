'use client'; // Mark as client component

import React, { useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import {
    useDecks,
    useDeleteDeckMutation,
    useImportDeckMutation,
} from '@/hooks/queryHooks';
import Button from '@/components/Button';
import { useAuth } from '@/context/useAuth';
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

        const validationResult = cardImportSchema.safeParse(parsedData);

        if (!validationResult.success) {
            const formattedErrors = validationResult.error.errors.map(err => {
                const path = err.path.join('.');
                return `${path ? `Card[${path}]: ` : ''}${err.message}`;
            }).join('\n');
            setValidationError(`JSON validation failed:\n${formattedErrors}`);
            return;
        }
        onSubmit(deckName.trim(), validationResult.data);
    };

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
                    <div>
                        <label htmlFor="import-json-data" className="block text-sm font-medium text-gray-700 mb-1">Paste Card JSON Here</label>
                        <textarea
                            id="import-json-data"
                            rows={10}
                            value={jsonInput}
                            onChange={handleJsonChange}
                            placeholder='[\n  {\n    "front": "Example Front 1",\n    "back": "Example Back 1"\n  },\n  {\n    "front": "Example Front 2",\n    "back": "Example Back 2"\n  }\n]'
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary font-mono text-sm"
                            disabled={isLoading}
                        />
                        {validationError && (
                            <p className="text-sm text-red-600 mt-1 whitespace-pre-wrap">{validationError}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Expected format: An array of objects, each with non-empty "front" and "back" string properties.
                            See <a href="/deck-import-format.md" target="_blank" rel="noopener noreferrer" className="underline text-primary">format details</a>.
                        </p>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="default" onClick={handleClose} disabled={isLoading} size="sm">Cancel</Button>
                        <Button type="submit" variant="primary" disabled={isLoading || !deckName.trim() || !jsonInput.trim()} size="sm">
                            {isLoading ? 'Importing...' : 'Import Deck'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function HomePage() {
    const { data: decks, isLoading: decksLoading, error: decksError } = useDecks();
    const deleteDeckMutation = useDeleteDeckMutation();
    const importDeckMutation = useImportDeckMutation();
    const { token } = useAuth();

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const handleDeleteDeck = (deckId: string) => {
        if (!token) return;
        if (window.confirm('Are you sure you want to delete this deck?')) {
            deleteDeckMutation.mutate({ deckId, token }, {
                onError: (err) => {
                    console.error("Failed to delete deck:", err);
                    alert(`Failed to delete deck: ${err.message}`);
                }
            });
        }
    };

    const handleImportDeckSubmit = (deckName: string, cardsData: ValidatedImportData) => {
        if (!token) return;
        importDeckMutation.mutate({ deckName, cardsData, token }, {
            onSuccess: (newDeck) => {
                setIsImportModalOpen(false);
                alert(`Deck "${newDeck.name}" imported successfully!`);
            },
            onError: (err) => {
                console.error("Failed to import deck:", err);
                alert(`Failed to import deck: ${err.message}`);
            }
        });
    };

    const isLoadingOverall = decksLoading || deleteDeckMutation.isPending || importDeckMutation.isPending;
    const overallError = decksError || deleteDeckMutation.error || importDeckMutation.error;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">My Decks</h1>

            {/* Action Buttons Panel */}
            {token && (
                <div className="p-4 sm:p-6 bg-primary/10 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-primary mb-4">Actions</h2>
                    <div className="flex flex-wrap gap-3 items-center">
                        <Button variant="secondary" size="sm" onClick={() => setIsImportModalOpen(true)} disabled={isLoadingOverall}>
                            Import Deck (JSON)
                        </Button>
                        <Link href="/deck/ai-generate" passHref legacyBehavior>
                            <Button as="a" variant="secondary" size="sm" disabled={isLoadingOverall}>Create with AI</Button>
                        </Link>
                        <Link href="/play/select" passHref legacyBehavior>
                            <Button as="a" variant="secondary" size="sm" disabled={isLoadingOverall}>Play Selected Decks</Button>
                        </Link>
                        <Link href="/quiz" passHref legacyBehavior>
                            <Button as="a" variant="secondary" size="sm" disabled={isLoadingOverall}>AI Quiz Generator</Button>
                        </Link>
                    </div>
                </div>
            )}

            {!token && (
                <p className="text-center text-gray-500 py-6">Please <Link href="/login" className="text-primary underline hover:text-red-700">login</Link> to manage your decks.</p>
            )}

            {/* Deck List */}
            {decksLoading && <div className="text-center text-gray-500 py-6">Loading decks...</div>}
            {overallError && <div className="text-center text-red-500 p-4 bg-red-50 rounded border border-red-200">Error loading data: {overallError.message || 'Unknown error'}</div>}
            {token && !decksLoading && !overallError && decks && (
                <ul className="space-y-4">
                    {decks.map((deck: Deck) => (
                        <li
                            key={deck.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-150"
                        >
                            <Link href={`/deck/${deck.id}/overview`} className="font-medium text-lg text-primary hover:underline break-words flex-grow">
                                {deck.name}
                            </Link>
                            <div className="flex flex-shrink-0 flex-wrap gap-2 mt-2 sm:mt-0 self-end sm:self-center">
                                <Link href={`/deck/${deck.id}/play`} passHref legacyBehavior><Button as="a" variant="default" size="sm">Play</Button></Link>
                                <Link href={`/deck/${deck.id}/edit`} passHref legacyBehavior><Button as="a" variant="default" size="sm">Edit</Button></Link>
                                <Button
                                    onClick={() => handleDeleteDeck(deck.id)}
                                    variant="primary"
                                    size="sm"
                                    disabled={deleteDeckMutation.isPending && deleteDeckMutation.variables?.deckId === deck.id}
                                >
                                    {(deleteDeckMutation.isPending && deleteDeckMutation.variables?.deckId === deck.id) ? 'Deleting...' : 'Delete'}
                                </Button>
                            </div>
                        </li>
                    ))}
                    {decks.length === 0 && (
                        <p className="text-center text-gray-500 py-10">No decks found. Use the actions above to create or import a new deck!</p>
                    )}
                </ul>
            )}

            <ImportDeckModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSubmit={handleImportDeckSubmit}
                isLoading={importDeckMutation.isPending}
            />
        </div>
    );
}