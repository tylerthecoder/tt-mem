'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCardsForReview, useCreateReviewEventMutation } from '@/hooks/queryHooks';
import { useAuth } from '@/context/useAuth';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';
import CardReviewer from '@/components/CardReviewer';
import type { ReviewResult } from '@/types';

// Helper function to build query string preserving params
function buildPlayQueryString(currentParams: URLSearchParams, newParams: Record<string, string>): string {
    const params = new URLSearchParams(currentParams);
    Object.entries(newParams).forEach(([key, value]) => {
        params.set(key, value);
    });
    return params.toString();
}

// Original page content moved to this client component
function PlayPageClientContent() {
    const searchParams = useSearchParams();
    const { token, isLoading: isAuthLoading } = useAuth();

    // Get params or use defaults
    const strategy = searchParams.get('strategy') === 'missedFirst' ? 'missedFirst' : 'random';
    const limitParam = searchParams.get('limit');
    const limit = limitParam && !isNaN(parseInt(limitParam)) ? parseInt(limitParam) : 100;
    const isFlipped = searchParams.get('flipped') === 'true';

    // State for current card index
    const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);

    // Fetch cards for review session
    const { data: reviewSequence, isLoading: isLoadingCards, error: cardsError, refetch } = useCardsForReview({
        token: token ?? undefined,
        limit,
        strategy,
        enabled: !!token, // Only run query if token is available
    });

    const createReviewMutation = useCreateReviewEventMutation();

    const handleReview = (result: ReviewResult) => {
        if (!reviewSequence || reviewSequence.length === 0 || !token || createReviewMutation.isPending) return;
        const safeIndex = currentCardIndex;
        if (safeIndex >= reviewSequence.length) return;

        const currentCard = reviewSequence[safeIndex];

        createReviewMutation.mutate(
            {
                cardId: currentCard.id,
                deckId: currentCard.deck_id,
                result,
            },
            {
                onSuccess: () => {
                    const nextIndex = currentCardIndex + 1;
                    setCurrentCardIndex(nextIndex);
                },
                onError: (err) => {
                    alert(`Failed to record review: ${err.message}`);
                },
            }
        );
    };

    const handlePlayAgain = () => {
        refetch();
        setCurrentCardIndex(0);
    };

    const isLoading = isAuthLoading || isLoadingCards;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-10">
                <Spinner /> <span className="ml-2 text-gray-500">Loading review session...</span>
            </div>
        );
    }

    if (!token) {
        return <div className="text-center text-gray-500 py-10">Please <Link href="/login" className="text-primary underline hover:text-red-700">login</Link> to play.</div>;
    }

    if (cardsError) {
        return <div className="text-center text-red-500 p-4 bg-red-50 rounded border border-red-200">Error loading cards: {(cardsError as Error).message || 'Unknown error'}.</div>;
    }

    if (!reviewSequence || reviewSequence.length === 0) {
        return (
            <div className="text-center space-y-6 py-10">
                <p className="text-xl text-gray-600">No cards found for this review session.</p>
                <p className="text-gray-500">You might not have any cards yet, or none matched the '{strategy}' strategy.</p>
                <div className="flex flex-wrap justify-center gap-3">
                    <Link href={`/`} passHref legacyBehavior>
                        <Button as="a" variant="default">Back to Decks</Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (currentCardIndex >= reviewSequence.length) {
        return (
            <div className="text-center space-y-6 py-10">
                <p className="text-2xl font-semibold text-green-600">Review Session Finished!</p>
                <p className="text-gray-600">You reviewed {reviewSequence.length} cards.</p>
                <div className="flex flex-wrap justify-center gap-3">
                    <Button onClick={handlePlayAgain} variant="secondary">Play Again ({strategy === 'missedFirst' ? 'Missed First' : 'Random'}, {limit})</Button>
                    <Link href={`/`} passHref legacyBehavior>
                        <Button as="a" variant="default">Back to Decks</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const currentCard = reviewSequence[currentCardIndex];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <Link href={`/`} className="text-sm text-primary hover:underline whitespace-nowrap">
                    &larr; Back to Decks
                </Link>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-700 text-center order-first sm:order-none">
                    Reviewing All Decks ({strategy === 'missedFirst' ? 'Missed First' : 'Random'}, {limit})
                </h1>
                <div className="text-center sm:text-right text-xs sm:min-w-[100px]">
                    {strategy === 'random' ? (
                        <Link
                            href={`/play?${buildPlayQueryString(searchParams, { strategy: 'missedFirst' })}`}
                            className="text-primary hover:underline"
                            replace
                        >
                            Switch to Missed First
                        </Link>
                    ) : (
                        <Link
                            href={`/play?${buildPlayQueryString(searchParams, { strategy: 'random' })}`}
                            className="text-primary hover:underline"
                            replace
                        >
                            Switch to Random
                        </Link>
                    )}
                </div>
            </div>
            <hr className="border-gray-300" />

            <p className="text-center text-base font-semibold text-gray-500">
                Card {currentCardIndex + 1} / {reviewSequence.length}
            </p>

            <CardReviewer
                card={currentCard}
                isFlipped={isFlipped}
                onReview={handleReview}
                isPendingReview={createReviewMutation.isPending}
            />
        </div>
    );
}

// Loading component for Suspense fallback
function LoadingState() {
    return (
        <div className="flex justify-center items-center py-10">
            <Spinner /> <span className="ml-2 text-gray-500">Loading play options...</span>
        </div>
    );
}

// Default export is now the server component wrapping the client component in Suspense
export default function GlobalPlayPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <PlayPageClientContent />
        </Suspense>
    );
}