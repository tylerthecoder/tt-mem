'use client';

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';
import { useAuth } from '@/context/useAuth';
import {
    useCreateDeckMutation,
    useImportDeckMutation,
    useGenerateAICardsMutation,
    useCreateDeckWithAICardsMutation,
} from '@/hooks/queryHooks';
import type { GeneratedCardData } from '@/actions/aiDecks';

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
    const generateCardsMutation = useGenerateAICardsMutation();
    const createDeckWithAICardsMutation = useCreateDeckWithAICardsMutation();

    const [manualDeckName, setManualDeckName] = useState('');
    const [manualCardsJson, setManualCardsJson] = useState('');
    const [manualError, setManualError] = useState<string | null>(null);

    const [aiInstructions, setAiInstructions] = useState('');
    const [aiNumberOfCards, setAiNumberOfCards] = useState<number>(10);
    const [aiGeneratedCards, setAiGeneratedCards] = useState<GeneratedCardData[]>([]);
    const [aiDeckName, setAiDeckName] = useState('');
    const [aiError, setAiError] = useState<string | null>(null);

    useEffect(() => {
        if (aiInstructions) {
            if (!aiDeckName.trim() || aiDeckName.startsWith('AI: ')) {
                const firstLine = aiInstructions.split('\n')[0];
                let suggestedName = `AI: ${firstLine.substring(0, 40)}`;
                if (firstLine.length > 40) {
                    suggestedName += '...';
                }
                setAiDeckName(suggestedName);
            }
        } else if (aiDeckName.startsWith('AI: ')) {
            setAiDeckName('');
        }
    }, [aiInstructions, aiDeckName]);

    const isManualSubmitting = createDeckMutation.isPending || importDeckMutation.isPending;
    const isCreatingFromAI = createDeckWithAICardsMutation.isPending;

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

    const handleGenerateCards = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setAiError(null);

        if (!token) {
            setAiError('You need to be logged in to generate cards with AI.');
            return;
        }

        if (!aiInstructions.trim()) {
            setAiError('Please provide instructions for the AI.');
            return;
        }

        if (aiNumberOfCards <= 0 || aiNumberOfCards > 50) {
            setAiError('Number of cards must be between 1 and 50.');
            return;
        }

        try {
            setAiGeneratedCards([]);
            const result = await generateCardsMutation.mutateAsync({
                userInstructions: aiInstructions.trim(),
                numberOfCards: aiNumberOfCards,
            });

            if (result.success && result.cards) {
                setAiGeneratedCards(result.cards);
                if (!aiDeckName.trim()) {
                    const firstLine = aiInstructions.split('\n')[0];
                    let suggestedName = `AI: ${firstLine.substring(0, 40)}`;
                    if (firstLine.length > 40) {
                        suggestedName += '...';
                    }
                    setAiDeckName(suggestedName);
                }
            } else {
                setAiError(result.message || 'Failed to generate cards.');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to generate cards.';
            setAiError(message);
        }
    };

    const handleCreateDeckFromAI = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setAiError(null);

        if (!token) {
            setAiError('You need to be logged in to create decks.');
            return;
        }
        if (!aiDeckName.trim()) {
            setAiError('Deck name is required.');
            return;
        }
        if (aiGeneratedCards.length === 0) {
            setAiError('Generate cards before creating the deck.');
            return;
        }

        try {
            const result = await createDeckWithAICardsMutation.mutateAsync({
                deckName: aiDeckName.trim(),
                cardsData: aiGeneratedCards,
            });

            if (result.deck) {
                if (result.success) {
                    alert(result.message || `Deck "${result.deck.name}" created successfully.`);
                } else if (result.message) {
                    alert(result.message);
                }
                router.push(`/deck/${result.deck.id}/overview`);
            } else {
                setAiError(result.message || 'Failed to create deck with AI cards.');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create deck with AI cards.';
            setAiError(message);
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

    const inputBaseStyle = "block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";
    const textAreaBaseStyle = `${inputBaseStyle} min-h-[120px]`;

    return (
        <div className="max-w-3xl mx-auto space-y-8 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Create a Deck</h1>
                <Link href="/decks" passHref legacyBehavior>
                    <Button as="a" variant="default" size="sm">&larr; Back to Decks</Button>
                </Link>
            </div>

            <section className="space-y-4 p-6 bg-white shadow-lg rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">1. Create Manually</h2>
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

            <section className="space-y-4 p-6 bg-white shadow-lg rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">2. Generate with AI</h2>
                <form onSubmit={handleGenerateCards} className="space-y-4">
                    <div>
                        <label htmlFor="aiInstructions" className="block text-sm font-medium text-gray-700 mb-1">Instructions for the AI</label>
                        <textarea
                            id="aiInstructions"
                            value={aiInstructions}
                            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setAiInstructions(event.target.value)}
                            className={textAreaBaseStyle}
                            rows={4}
                            placeholder="Explain the topic or include sample questions you want flashcards for."
                        />
                    </div>
                    <div>
                        <label htmlFor="aiNumberOfCards" className="block text-sm font-medium text-gray-700 mb-1">Number of Cards (1-50)</label>
                        <input
                            id="aiNumberOfCards"
                            type="number"
                            value={aiNumberOfCards}
                            min={1}
                            max={50}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                const value = parseInt(event.target.value, 10);
                                if (Number.isNaN(value)) {
                                    setAiNumberOfCards(1);
                                } else {
                                    setAiNumberOfCards(Math.max(1, Math.min(50, value)));
                                }
                            }}
                            className={inputBaseStyle}
                        />
                    </div>
                    <Button
                        type="submit"
                        variant="secondary"
                        disabled={generateCardsMutation.isPending || !aiInstructions.trim()}
                        className="w-full sm:w-auto"
                    >
                        {generateCardsMutation.isPending ? <><Spinner size="sm" /> Generating…</> : 'Generate Cards'}
                    </Button>
                </form>
                {aiError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{aiError}</p>
                )}

                {aiGeneratedCards.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-700">Preview Generated Cards ({aiGeneratedCards.length})</h3>
                        <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                            {aiGeneratedCards.map((card, index) => (
                                <div key={`${card.front_text}-${index}`} className="p-3 border border-gray-300 rounded-md bg-gray-50">
                                    <p className="font-semibold text-gray-700">Q: {card.front_text}</p>
                                    <p className="text-gray-600">A: {card.back_text}</p>
                                    {card.extra_context && <p className="text-xs text-gray-500 mt-1">Context: {card.extra_context}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {aiGeneratedCards.length > 0 && (
                    <form onSubmit={handleCreateDeckFromAI} className="space-y-4">
                        <div>
                            <label htmlFor="aiDeckName" className="block text-sm font-medium text-gray-700 mb-1">Deck Name</label>
                            <input
                                id="aiDeckName"
                                type="text"
                                value={aiDeckName}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => setAiDeckName(event.target.value)}
                                className={inputBaseStyle}
                                placeholder="AI Generated Deck"
                            />
                        </div>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isCreatingFromAI || !aiDeckName.trim()}
                            className="w-full sm:w-auto"
                        >
                            {isCreatingFromAI ? <><Spinner size="sm" /> Creating Deck…</> : 'Create Deck with These Cards'}
                        </Button>
                    </form>
                )}
            </section>
        </div>
    );
}
