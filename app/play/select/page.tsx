'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDecks } from '@/hooks/queryHooks';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';
import type { Deck } from '@/types';
import { useAuth } from '@/context/useAuth';

export default function SelectDecksForPlayPage() {
    const router = useRouter();
    const { token, isLoading: isLoadingAuth } = useAuth();
    const { data: decks, isLoading: isLoadingDecks, error: decksError } = useDecks();
    const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set());

    const handleToggleDeckSelection = (deckId: string) => {
        setSelectedDeckIds(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(deckId)) {
                newSelection.delete(deckId);
            } else {
                newSelection.add(deckId);
            }
            return newSelection;
        });
    };

    const handleSelectAll = () => {
        if (decks) {
            const allDeckIds = decks.map(deck => deck.id);
            setSelectedDeckIds(new Set(allDeckIds));
        }
    };

    const handleDeselectAll = () => {
        setSelectedDeckIds(new Set());
    };

    const handleStartPlaying = () => {
        if (selectedDeckIds.size === 0) {
            alert('Please select at least one deck to play.');
            return;
        }
        const idsArray = Array.from(selectedDeckIds);
        router.push(`/play?deckIds=${idsArray.join(',')}`);
    };

    const isLoading = isLoadingAuth || isLoadingDecks;

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen">
                <Spinner />
                <p className="mt-2 text-gray-500">Loading decks...</p>
            </div>
        );
    }

    if (!token && !isLoadingAuth) {
        return (
            <div className="text-center py-10">
                <p className="mb-4 text-lg text-gray-700">You need to be logged in to select decks.</p>
                <Link href="/login" legacyBehavior passHref><Button as="a">Login</Button></Link>
            </div>
        );
    }

    if (decksError) {
        return <div className="text-center text-red-500 p-4">Error loading decks: {decksError.message}</div>;
    }

    if (!decks || decks.length === 0) {
        return (
            <div className="text-center py-10 space-y-4">
                <p className="text-lg text-gray-500">No decks available to select.</p>
                <Link href="/" passHref legacyBehavior>
                    <Button as="a" variant="secondary">Back to My Decks</Button>
                </Link>
            </div>
        );
    }

    // Determine if all decks are currently selected
    const allDecksSelected = decks && selectedDeckIds.size === decks.length;

    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Select Decks to Play</h1>
                <Link href="/" passHref legacyBehavior>
                    <Button as="a" variant="default" size="sm">&larr; My Decks</Button>
                </Link>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 space-y-4">
                <div className="flex flex-wrap gap-2 mb-4">
                    <Button onClick={handleSelectAll} variant="default" size="sm" disabled={isLoadingDecks || !decks || decks.length === 0 || allDecksSelected}>
                        Select All
                    </Button>
                    <Button onClick={handleDeselectAll} variant="default" size="sm" disabled={isLoadingDecks || selectedDeckIds.size === 0}>
                        Deselect All
                    </Button>
                </div>
                <div className="space-y-1">
                    {decks.map((deck) => (
                        <div key={deck.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 rounded-md px-2 -mx-2 transition-colors">
                            <label htmlFor={`deck-${deck.id}`} className="flex items-center space-x-3 cursor-pointer flex-grow py-1">
                                <input
                                    type="checkbox"
                                    id={`deck-${deck.id}`}
                                    checked={selectedDeckIds.has(deck.id)}
                                    onChange={() => handleToggleDeckSelection(deck.id)}
                                    className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded disabled:opacity-50"
                                />
                                <span className="text-gray-700 font-medium">{deck.name}</span>
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row justify-end items-center gap-3">
                <p className="text-sm text-gray-600">
                    {selectedDeckIds.size} deck{selectedDeckIds.size === 1 ? '' : 's'} selected.
                </p>
                <Button
                    onClick={handleStartPlaying}
                    disabled={selectedDeckIds.size === 0}
                    variant="primary"
                    size="base" // Explicitly base size for primary action button
                >
                    Start Playing Selected
                </Button>
            </div>
        </div>
    );
}