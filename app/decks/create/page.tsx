'use client';

import React, { useState, FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import PageHeader from '@/components/PageHeader';
import Spinner from '@/components/Spinner';
import { useAuth } from '@/context/useAuth';
import {
    useCreateDeckMutation,
    useImportDeckMutation,
} from '@/hooks/queryHooks';

interface ParsedCardData {
    front: string;
    back: string;
}

function parseCardsJson(input: string): ParsedCardData[] {
    let parsed: unknown;
    try {
        parsed = JSON.parse(input);
    } catch {
        throw new Error('Invalid JSON: please provide valid card data.');
    }

    if (!Array.isArray(parsed)) {
        throw new Error('Cards JSON must be an array of card objects.');
    }

    return parsed.map((card, index) => {
        if (!card || typeof card !== 'object') {
            throw new Error(`Card ${index + 1} is not a valid object.`);
        }
        const front = (card as Record<string, unknown>).front;
        const back = (card as Record<string, unknown>).back;
        if (typeof front !== 'string' || !front.trim()) {
            throw new Error(`Card ${index + 1}: "front" text is required.`);
        }
        if (typeof back !== 'string' || !back.trim()) {
            throw new Error(`Card ${index + 1}: "back" text is required.`);
        }
        return { front: front.trim(), back: back.trim() };
    });
}

export default function CreateDeckPage() {
    const router = useRouter();
    const { token, isLoading: isLoadingAuth } = useAuth();

    const createDeckMutation = useCreateDeckMutation();
    const importDeckMutation = useImportDeckMutation();

    const [manualDeckName, setManualDeckName] = useState('');
    const [manualCardsJson, setManualCardsJson] = useState('');
    const [manualError, setManualError] = useState<string | null>(null);

    const isManualSubmitting = createDeckMutation.isPending || importDeckMutation.isPending;

    const handleManualSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setManualError(null);

        if (!token) {
            setManualError('You need to be logged in to create decks.');
            return;
        }

        const trimmedName = manualDeckName.trim();
        if (!trimmedName) {
            setManualError('Deck name is required.');
            return;
        }

        try {
            let createdDeckId: string | null = null;

            if (manualCardsJson.trim()) {
                const cards = parseCardsJson(manualCardsJson);
                const deck = await importDeckMutation.mutateAsync({
                    deckName: trimmedName,
                    cardsData: cards,
                    token,
                });
                createdDeckId = deck.id;
            } else {
                const deck = await createDeckMutation.mutateAsync({
                    name: trimmedName,
                    token,
                });
                createdDeckId = deck.id;
            }

            if (createdDeckId) {
                router.push(`/deck/${createdDeckId}/overview`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create deck.';
            setManualError(message);
        }
    };

    if (isLoadingAuth) {
        return (
            <div className="flex justify-center items-center py-10">
                <Spinner /> <span className="ml-2">Checking authentication…</span>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="text-center space-y-4 py-10">
                <p className="text-lg text-gray-700">You need to be logged in to create decks.</p>
                <Link href="/login" passHref legacyBehavior>
                    <Button as="a" variant="primary">Login</Button>
                </Link>
            </div>
        );
    }

    const inputBaseStyle = 'block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm';
    const textAreaBaseStyle = `${inputBaseStyle} min-h-[120px]`;

    return (
        <div className="max-w-3xl mx-auto space-y-8 p-4 sm:p-6">
            <PageHeader
                title="Create a Deck"
                backHref="/decks"
                backLabel="Decks"
            />

            <section className="space-y-4 p-6 bg-white shadow-lg rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Create Manually</h2>
                <p className="text-sm text-gray-600">
                    Provide a deck name and, optionally, paste JSON card data to import cards while creating the deck.
                </p>
                <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="manualDeckName" className="block text-sm font-medium text-gray-700 mb-1">Deck Name</label>
                        <input
                            id="manualDeckName"
                            type="text"
                            value={manualDeckName}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setManualDeckName(event.target.value)}
                            className={inputBaseStyle}
                            placeholder="My New Deck"
                        />
                    </div>
                    <div>
                        <label htmlFor="manualCardsJson" className="block text-sm font-medium text-gray-700 mb-1">Optional Cards JSON</label>
                        <textarea
                            id="manualCardsJson"
                            value={manualCardsJson}
                            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setManualCardsJson(event.target.value)}
                            className={textAreaBaseStyle}
                            placeholder='[{"front": "Question", "back": "Answer"}]'
                        />
                        <p className="text-xs text-gray-500 mt-1">Use an array of objects with <code>front</code> and <code>back</code> fields.</p>
                    </div>
                    {manualError && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{manualError}</p>
                    )}
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isManualSubmitting || !manualDeckName.trim()}
                        className="w-full sm:w-auto"
                    >
                        {isManualSubmitting ? <><Spinner size="sm" /> Creating…</> : 'Create Deck'}
                    </Button>
                </form>
            </section>
        </div>
    );
}
