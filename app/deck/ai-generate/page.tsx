'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';
import { useGenerateAICardsMutation, useCreateDeckWithAICardsMutation } from '@/hooks/queryHooks';
import type { GeneratedCardData } from '@/actions/aiDecks';
import { useAuth } from '@/context/useAuth';

export default function AIGenerateDeckPage() {
    const router = useRouter();
    const { token, isLoading: isLoadingAuth } = useAuth();

    const [userInstructions, setUserInstructions] = useState('');
    const [numberOfCards, setNumberOfCards] = useState<number>(5);
    const [generatedCards, setGeneratedCards] = useState<GeneratedCardData[]>([]);
    const [deckName, setDeckName] = useState('');

    const generateCardsMutation = useGenerateAICardsMutation();
    const createDeckMutation = useCreateDeckWithAICardsMutation();

    useEffect(() => {
        if (userInstructions) {
            if (!deckName.trim() || deckName.startsWith('AI: ')) {
                const firstLine = userInstructions.split('\n')[0];
                let suggestedName = `AI: ${firstLine.substring(0, 40)}`;
                if (firstLine.length > 40) {
                    suggestedName += '...';
                }
                setDeckName(suggestedName);
            }
        } else {
            if (deckName.startsWith('AI: ')) {
                setDeckName('');
            }
        }
    }, [userInstructions]);

    const handleGenerateCards = async (e: FormEvent) => {
        e.preventDefault();
        if (!userInstructions.trim() || numberOfCards <= 0) {
            alert('Please provide instructions and a valid number of cards.');
            return;
        }
        setGeneratedCards([]);
        generateCardsMutation.mutate({ userInstructions, numberOfCards }, {
            onSuccess: (data) => {
                if (data.success && data.cards) {
                    setGeneratedCards(data.cards);
                    if (!deckName.trim() && userInstructions) {
                        const firstLine = userInstructions.split('\n')[0];
                        let suggestedName = `AI: ${firstLine.substring(0, 40)}`;
                        if (firstLine.length > 40) {
                            suggestedName += '...';
                        }
                        setDeckName(suggestedName);
                    }
                } else {
                    alert(`Failed to generate cards: ${data.message || 'Unknown error'}`);
                }
            },
            onError: (error) => {
                alert(`Error generating cards: ${error.message}`);
            }
        });
    };

    const handleCreateDeck = async (e: FormEvent) => {
        e.preventDefault();
        if (!deckName.trim() || generatedCards.length === 0) {
            alert('Please enter a deck name and generate some cards first.');
            return;
        }
        createDeckMutation.mutate({ deckName, cardsData: generatedCards }, {
            onSuccess: (data) => {
                if (data.success && data.deck) {
                    alert(`Deck "${data.deck.name}" created successfully with ${data.createdCardsCount} cards!`);
                    router.push(`/deck/${data.deck.id}/overview`);
                } else {
                    alert(`Failed to create deck: ${data.message || 'Unknown error'}`);
                    if (data.failedCardsData && data.failedCardsData.length > 0) {
                        console.warn("Cards that failed to be added:", data.failedCardsData);
                    }
                }
            },
            onError: (error) => {
                alert(`Error creating deck: ${error.message}`);
            }
        });
    };

    if (isLoadingAuth) {
        return <div className="flex justify-center items-center py-10"><Spinner /> <span className="ml-2">Loading auth...</span></div>;
    }

    if (!token && !isLoadingAuth) {
        return (
            <div className="text-center py-10">
                <p className="mb-4 text-lg text-gray-700">You need to be logged in to create decks with AI.</p>
                <Link href="/login" legacyBehavior passHref><Button as="a">Login</Button></Link>
            </div>
        );
    }

    const inputBaseStyle = "block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";
    const textAreaBaseStyle = `${inputBaseStyle} min-h-[100px]`;

    return (
        <div className="max-w-2xl mx-auto space-y-8 p-4 sm:p-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Generate Deck with AI</h1>
                <Link href="/" passHref legacyBehavior>
                    <Button variant="default" as="a">&larr; Back to Decks</Button>
                </Link>
            </div>

            <form onSubmit={handleGenerateCards} className="space-y-4 p-6 bg-white shadow-lg rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700">1. Generate Cards</h2>
                <div>
                    <label htmlFor="userInstructions" className="block text-sm font-medium text-gray-600 mb-1">Instructions for AI</label>
                    <textarea
                        id="userInstructions"
                        value={userInstructions}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setUserInstructions(e.target.value)}
                        placeholder="e.g., Key terms from Chapter 3 of Intro to Psychology, focusing on classical conditioning. Or, common JavaScript array methods and their primary uses."
                        className={textAreaBaseStyle}
                        rows={4}
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">Provide detailed instructions or a description of the subject matter for the flashcards.</p>
                </div>
                <div>
                    <label htmlFor="numberOfCards" className="block text-sm font-medium text-gray-600 mb-1">Number of Cards (1-20)</label>
                    <input
                        type="number"
                        id="numberOfCards"
                        value={numberOfCards}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNumberOfCards(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
                        min="1"
                        max="20"
                        className={inputBaseStyle}
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">Max 20 cards. The more specific your instructions, the better the results.</p>
                </div>
                <Button
                    type="submit"
                    disabled={generateCardsMutation.isPending || !userInstructions.trim()}
                    className="w-full sm:w-auto"
                >
                    {generateCardsMutation.isPending ? <><Spinner size="sm" /> Generating...</> : 'Generate Cards'}
                </Button>
                {generateCardsMutation.isError && (
                    <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">Error: {generateCardsMutation.error?.message || 'Could not generate cards.'}</p>
                )}
            </form>

            {generatedCards.length > 0 && (
                <section className="space-y-4 p-6 bg-white shadow-lg rounded-lg border border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-700">2. Review Generated Cards ({generatedCards.length})</h2>
                    <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                        {generatedCards.map((card, index) => (
                            <div key={index} className="p-3 border border-gray-300 rounded-md bg-gray-50">
                                <p className="font-semibold text-gray-700">Q: {card.front_text}</p>
                                <p className="text-gray-600">A: {card.back_text}</p>
                                {card.extra_context && <p className="text-xs text-gray-500 mt-1">Context: {card.extra_context}</p>}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {generatedCards.length > 0 && (
                <form onSubmit={handleCreateDeck} className="space-y-4 p-6 bg-white shadow-lg rounded-lg border border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-700">3. Create Deck</h2>
                    <div>
                        <label htmlFor="deckName" className="block text-sm font-medium text-gray-600 mb-1">Deck Name</label>
                        <input
                            type="text"
                            id="deckName"
                            value={deckName}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setDeckName(e.target.value)}
                            placeholder="Enter name for your new deck"
                            className={inputBaseStyle}
                            required
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={createDeckMutation.isPending || !deckName.trim() || generatedCards.length === 0}
                        className="w-full sm:w-auto"
                    >
                        {createDeckMutation.isPending ? <><Spinner size="sm" /> Creating Deck...</> : 'Create Deck with These Cards'}
                    </Button>
                    {createDeckMutation.isError && (
                        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">Error: {createDeckMutation.error?.message || 'Could not create deck.'}</p>
                    )}
                </form>
            )}

        </div>
    );
}