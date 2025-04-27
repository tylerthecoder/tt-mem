'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation'; // Use next hooks
import Link from 'next/link';
import Button from '@/components/Button'; // Use path alias
import { useDeckCards } from '@/hooks/queryHooks'; // Use path alias
// Remove old react-router imports
// import { useParams, Link } from 'react-router-dom';
// import Button from '../components/Button';

// Inline types needed due to import issues / mock hook structure
interface Card { // Keep Card because useDeckCards returns it, even if mock
    id: string;
    front_text: string;
    back_text: string;
}

enum ReviewResult { // Define ReviewResult inline
    EASY = "easy",
    MEDIUM = "medium",
    HARD = "hard",
    MISSED = "missed",
}

export default function PlayDeckPage() { // Rename component
    const params = useParams();
    const deckId = typeof params?.deckId === 'string' ? params.deckId : undefined;

    // Fetch cards (currently mock)
    // Only fetch if deckId is valid
    const { data: cards, isLoading, error }: { data: Card[], isLoading: boolean, error: null } = useDeckCards(deckId);

    // Local state for UI interaction
    const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
    const [showBack, setShowBack] = useState<boolean>(false);

    // Reset card index and visibility when cards data changes (e.g., on initial load or refetch)
    useEffect(() => {
        if (cards && cards.length > 0) {
            setCurrentCardIndex(0);
            setShowBack(false);
        }
    }, [cards]);

    const handleShowAnswer = () => {
        setShowBack(true);
    };

    const handleReview = (result: ReviewResult) => {
        if (!cards || cards.length === 0 || deckId === undefined) return;
        const safeIndex = currentCardIndex % cards.length;
        console.log(`Card ${cards[safeIndex].id} reviewed as: ${result}`);
        // TODO: Call server action to record review event

        const nextIndex = (currentCardIndex + 1) % cards.length;
        setCurrentCardIndex(nextIndex);
        setShowBack(false);
    };

    // Add check for undefined deckId before loading/error checks
    if (deckId === undefined) {
        return <div className="text-center text-red-500 dark:text-red-400">Invalid Deck ID</div>;
    }

    // Loading state
    if (isLoading) {
        return <div className="text-center text-gray-500 dark:text-gray-400">Loading deck... (Fetching Disabled)</div>;
    }

    // Error State
    if (error) {
        return <div className="text-center text-red-500 dark:text-red-400">An error occurred loading the deck.</div>;
    }

    // Empty Deck State
    if (!cards || cards.length === 0) {
        return <div className="text-center text-gray-500 dark:text-gray-400">Deck is empty. <Link href={`/deck/${deckId}/edit`} className="text-primary underline">Add cards</Link></div>;
    }

    // Valid card index calculation
    const safeCurrentCardIndex = currentCardIndex % cards.length;
    const currentCard = cards[safeCurrentCardIndex];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-primary">Playing Deck: {deckId}</h1>
                {/* Use Next Link with Button */}
                <Link href={`/deck/${deckId}/edit`} passHref legacyBehavior>
                    <Button as="a" variant="default">Edit this Deck</Button>
                </Link>
            </div>
            <hr className="border-gray-300 dark:border-gray-700" />

            <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg text-center space-y-4 min-h-[250px] flex flex-col justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-4">
                        Card {safeCurrentCardIndex + 1} / {cards.length}
                    </h2>
                    <p className="text-2xl font-medium mb-4 min-h-[3em]">{currentCard?.front_text}</p>
                    {showBack && (
                        <p className="text-xl text-secondary min-h-[2.5em]">{currentCard?.back_text}</p>
                    )}
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    {showBack ? (
                        <div className="space-y-3">
                            <p className="font-medium">How well did you know it?</p>
                            <div className="flex justify-center space-x-2">
                                <Button onClick={() => handleReview(ReviewResult.EASY)} variant="easy" size="sm">Easy</Button>
                                <Button onClick={() => handleReview(ReviewResult.MEDIUM)} variant="medium" size="sm">Medium</Button>
                                <Button onClick={() => handleReview(ReviewResult.HARD)} variant="hard" size="sm">Hard</Button>
                                <Button onClick={() => handleReview(ReviewResult.MISSED)} variant="missed" size="sm">Missed</Button>
                            </div>
                        </div>
                    ) : (
                        <Button onClick={handleShowAnswer} variant="secondary">Show Answer</Button>
                    )}
                </div>
            </div>
        </div>
    );
}