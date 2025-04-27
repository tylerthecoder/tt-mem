'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/Button';
import { useDeckCards, useCreateReviewEventMutation } from '@/hooks/queryHooks';
import { ReviewResult } from '@/types';

export default function PlayDeckPage() {
    const params = useParams();
    const deckId = typeof params?.deckId === 'string' ? params.deckId : undefined;

    const { data: cards, isLoading, error } = useDeckCards(deckId);
    const createReviewMutation = useCreateReviewEventMutation();

    const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
    const [showBack, setShowBack] = useState<boolean>(false);

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
        if (!cards || cards.length === 0 || deckId === undefined || createReviewMutation.isPending) return;
        const safeIndex = currentCardIndex;
        if (safeIndex >= cards.length) return;
        const cardId = cards[safeIndex].id;

        createReviewMutation.mutate({ cardId, deckId, result }, {
            onSuccess: () => {
                const nextIndex = currentCardIndex + 1;
                setCurrentCardIndex(nextIndex);
                setShowBack(false);
            },
            onError: (err) => {
                alert(`Failed to record review: ${err.message}`);
            }
        });
    };

    if (deckId === undefined) {
        return <div className="text-center text-red-500">Invalid Deck ID</div>;
    }

    if (isLoading && !cards) {
        return <div className="text-center text-gray-500">Loading deck...</div>;
    }
    if (error) {
        return <div className="text-center text-red-500">Error loading deck: {error.message || 'Unknown error'}.</div>;
    }
    if (!isLoading && (!cards || cards.length === 0)) {
        return <div className="text-center text-gray-500">Deck is empty. <Link href={`/deck/${deckId}/edit`} className="text-primary underline">Add cards</Link></div>;
    }
    if (!cards) return null;

    // Handle deck completion state
    if (currentCardIndex >= cards.length) {
        return (
            <div className="text-center space-y-4">
                <p className="text-xl font-semibold">Deck finished!</p>
                <Link href={`/deck/${deckId}/edit`} passHref legacyBehavior>
                    <Button as="a" variant="default">Edit Deck</Button>
                </Link>
                <Button onClick={() => { setCurrentCardIndex(0); setShowBack(false); }} variant="secondary">Play Again</Button>
                <Link href={`/`} passHref legacyBehavior>
                    <Button as="a" variant="default">Back to Decks</Button>
                </Link>
            </div>
        );
    }

    const currentCard = cards[currentCardIndex];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-primary">Playing Deck: {deckId}</h1>
                <Link href={`/deck/${deckId}/edit`} passHref legacyBehavior>
                    <Button as="a" variant="default">Edit this Deck</Button>
                </Link>
            </div>
            <hr className="border-gray-300" />

            <div className="bg-white p-6 rounded shadow-lg text-center space-y-4 min-h-[250px] flex flex-col justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-500 mb-4">
                        Card {currentCardIndex + 1} / {cards.length}
                    </h2>
                    <p className="text-2xl font-medium mb-4 min-h-[3em] whitespace-pre-wrap text-gray-900">{currentCard?.front_text}</p>
                    {showBack && (
                        <p className="text-xl text-secondary min-h-[2.5em] whitespace-pre-wrap">{currentCard?.back_text}</p>
                    )}
                </div>
                <div className="pt-4 border-t border-gray-200">
                    {showBack ? (
                        <div className="space-y-3">
                            <p className="font-medium text-gray-700">How well did you know it?</p>
                            <div className="flex flex-wrap justify-center gap-2">
                                <Button onClick={() => handleReview(ReviewResult.EASY)} variant="easy" size="sm" disabled={createReviewMutation.isPending}>Easy</Button>
                                <Button onClick={() => handleReview(ReviewResult.MEDIUM)} variant="medium" size="sm" disabled={createReviewMutation.isPending}>Medium</Button>
                                <Button onClick={() => handleReview(ReviewResult.HARD)} variant="hard" size="sm" disabled={createReviewMutation.isPending}>Hard</Button>
                                <Button onClick={() => handleReview(ReviewResult.MISSED)} variant="missed" size="sm" disabled={createReviewMutation.isPending}>Missed</Button>
                            </div>
                            {createReviewMutation.isPending && <p className="text-sm text-gray-500">Recording...</p>}
                        </div>
                    ) : (
                        <Button onClick={handleShowAnswer} variant="secondary" disabled={createReviewMutation.isPending}>Show Answer</Button>
                    )}
                </div>
            </div>
        </div>
    );
}