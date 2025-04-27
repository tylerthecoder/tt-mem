'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/Button';
import { useDeckCards, useCreateReviewEventMutation, useDeck } from '@/hooks/queryHooks';
import { ReviewResult, Card } from '@/types';

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export default function PlayDeckPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const deckId = typeof params?.deckId === 'string' ? params.deckId : undefined;
    const isFlipped = searchParams.get('flipped') === 'true';
    const shouldRandomize = searchParams.get('randomize') === 'true';

    const { data: cards, isLoading: isLoadingCards, error: cardsError } = useDeckCards(deckId);
    const createReviewMutation = useCreateReviewEventMutation();
    const { data: deck, isLoading: deckLoading } = useDeck(deckId);

    const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
    const [showTarget, setShowTarget] = useState<boolean>(false);
    const [reviewSequence, setReviewSequence] = useState<Card[]>([]);

    useEffect(() => {
        if (cards && cards.length > 0) {
            const sequence = shouldRandomize ? shuffleArray(cards) : cards;
            setReviewSequence(sequence);
            setCurrentCardIndex(0);
            setShowTarget(false);
        } else {
            setReviewSequence([]);
        }
    }, [cards, shouldRandomize]);

    const handleShowTarget = () => {
        setShowTarget(true);
    };

    const handleReview = (result: ReviewResult) => {
        if (!reviewSequence || reviewSequence.length === 0 || deckId === undefined || createReviewMutation.isPending) return;
        const safeIndex = currentCardIndex;
        if (safeIndex >= reviewSequence.length) return;
        const cardId = reviewSequence[safeIndex].id;

        createReviewMutation.mutate({ cardId, deckId, result }, {
            onSuccess: () => {
                const nextIndex = currentCardIndex + 1;
                if (nextIndex < reviewSequence.length) {
                    setCurrentCardIndex(nextIndex);
                    setShowTarget(false);
                } else {
                    setCurrentCardIndex(nextIndex);
                }
            },
            onError: (err) => {
                alert(`Failed to record review: ${err.message}`);
            }
        });
    };

    const isLoading = isLoadingCards || deckLoading;
    if (deckId === undefined) {
        return <div className="text-center text-red-500">Invalid Deck ID</div>;
    }
    if (isLoading && (!cards || !deck)) {
        return <div className="text-center text-gray-500 py-10">Loading deck...</div>;
    }
    if (cardsError) {
        return <div className="text-center text-red-500 p-4 bg-red-50 rounded border border-red-200">Error loading deck: {cardsError.message || 'Unknown error'}.</div>;
    }
    if (!isLoading && (!reviewSequence || reviewSequence.length === 0)) {
        return <div className="text-center text-gray-500 py-10">Deck is empty. <Link href={`/deck/${deckId}/edit`} className="text-primary underline hover:text-red-700">Add cards</Link></div>;
    }
    if (!reviewSequence) return null;

    if (currentCardIndex >= reviewSequence.length) {
        return (
            <div className="text-center space-y-6 py-10">
                <p className="text-2xl font-semibold text-green-600">Deck finished!</p>
                <div className="flex flex-wrap justify-center gap-3">
                    <Button onClick={() => {
                        setCurrentCardIndex(0);
                        setShowTarget(false);
                    }} variant="secondary">Play Again {shouldRandomize ? '(Randomized)' : ''}</Button>
                    <Link href={`/deck/${deckId}/overview`} passHref legacyBehavior>
                        <Button as="a" variant="default">Back to Overview</Button>
                    </Link>
                    <Link href={`/`} passHref legacyBehavior>
                        <Button as="a" variant="default">Back to Decks</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const currentCard = reviewSequence[currentCardIndex];
    if (!currentCard) {
        return <div className="text-center text-gray-500">Loading card...</div>;
    }

    const initialText = isFlipped ? currentCard.back_text : currentCard.front_text;
    const targetText = isFlipped ? currentCard.front_text : currentCard.back_text;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <Link href={`/deck/${deckId}/overview`} className="text-sm text-primary hover:underline whitespace-nowrap">
                    &larr; Overview
                </Link>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-700 text-center order-first sm:order-none">
                    Playing: <span className="text-primary font-bold">{deck?.name || '...'}</span> {isFlipped ? '(Flipped)' : ''} {shouldRandomize ? '(Randomized)' : ''}
                </h1>
                <Link href={`/deck/${deckId}/edit`} passHref legacyBehavior>
                    <Button as="a" variant="default" size="sm" className="whitespace-nowrap">Edit Deck</Button>
                </Link>
            </div>
            <hr className="border-gray-300" />

            <div className="bg-white p-6 rounded-lg shadow-lg text-center space-y-6 min-h-[300px] sm:min-h-[350px] flex flex-col justify-between">
                <div>
                    <h2 className="text-base font-semibold text-gray-500 mb-4">
                        Card {currentCardIndex + 1} / {reviewSequence.length}
                    </h2>
                    <p className="text-2xl sm:text-3xl font-medium mb-4 min-h-[3em] flex items-center justify-center whitespace-pre-wrap text-gray-900">{initialText}</p>
                </div>
                <div className="space-y-4">
                    <div className="min-h-[3em] flex items-center justify-center">
                        {showTarget && (
                            <p className="text-xl sm:text-2xl text-secondary whitespace-pre-wrap">{targetText}</p>
                        )}
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                        {showTarget ? (
                            <div className="space-y-4">
                                <p className="font-medium text-gray-700">How well did you know it?</p>
                                <div className="flex flex-wrap justify-center gap-3">
                                    <Button onClick={() => handleReview(ReviewResult.EASY)} variant="easy" size="sm" disabled={createReviewMutation.isPending}>Easy</Button>
                                    <Button onClick={() => handleReview(ReviewResult.MEDIUM)} variant="medium" size="sm" disabled={createReviewMutation.isPending}>Medium</Button>
                                    <Button onClick={() => handleReview(ReviewResult.HARD)} variant="hard" size="sm" disabled={createReviewMutation.isPending}>Hard</Button>
                                    <Button onClick={() => handleReview(ReviewResult.MISSED)} variant="missed" size="sm" disabled={createReviewMutation.isPending}>Missed</Button>
                                </div>
                                {createReviewMutation.isPending && <p className="text-sm text-gray-500 pt-2">Recording...</p>}
                            </div>
                        ) : (
                            <Button onClick={handleShowTarget} variant="secondary" disabled={createReviewMutation.isPending}>Show {isFlipped ? 'Front' : 'Back'}</Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}