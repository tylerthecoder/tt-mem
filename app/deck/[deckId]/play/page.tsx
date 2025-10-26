'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/Button';
import {
    useDeckCards,
    useCreateReviewEventMutation,
    useDeck,
    useMissedCardsForDeckInTimeframe
} from '@/hooks/queryHooks';
import { useAuth } from '@/context/useAuth';
import { ReviewResult, Card } from '@/types';
import CardReviewer from '@/components/CardReviewer';
import Spinner from '@/components/Spinner';

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
    if (!array || array.length === 0) return [];
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
    const router = useRouter();
    const pathname = usePathname();
    const deckId = typeof params?.deckId === 'string' ? params.deckId : undefined;
    const isFlipped = searchParams.get('flipped') === 'true';
    const playStrategy = (searchParams.get('strategy') ?? undefined) === 'missedInTimeframe' ? 'missedInTimeframe' : 'all';
    const timeframeParam = searchParams.get('timeframe') ?? undefined;
    const cardParamRaw = searchParams.get('card');

    let timeframeDaysParsed: number | undefined = undefined;
    if (timeframeParam) {
        const parsed = parseInt(timeframeParam, 10);
        if (!isNaN(parsed) && parsed > 0) {
            timeframeDaysParsed = parsed;
        }
    }
    const desiredCardIndexFromParam = useMemo(() => {
        if (!cardParamRaw) return 0;
        const parsed = parseInt(cardParamRaw, 10);
        if (isNaN(parsed) || parsed < 1) {
            return 0;
        }
        return parsed - 1;
    }, [cardParamRaw]);

    const { token } = useAuth();

    // Conditional hooks
    const allCardsQuery = useDeckCards(deckId);
    const missedCardsQuery = useMissedCardsForDeckInTimeframe({
        deckId,
        timeframeDays: timeframeDaysParsed,
        token: token ?? undefined,
        enabled: playStrategy === 'missedInTimeframe' && !!deckId && !!timeframeDaysParsed && timeframeDaysParsed > 0 && !!token,
    });

    const cardsToUse = useMemo(() => {
        if (playStrategy === 'missedInTimeframe') {
            return missedCardsQuery.data;
        }
        return allCardsQuery.data;
    }, [playStrategy, allCardsQuery.data, missedCardsQuery.data]);

    const isLoadingCards = playStrategy === 'missedInTimeframe' ? missedCardsQuery.isLoading : allCardsQuery.isLoading;
    const cardsError = playStrategy === 'missedInTimeframe' ? missedCardsQuery.error : allCardsQuery.error;

    const createReviewMutation = useCreateReviewEventMutation();
    const { data: deck, isLoading: isLoadingDeck } = useDeck(deckId);

    const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
    const [reviewSequence, setReviewSequence] = useState<Card[]>([]);

    useEffect(() => {
        if (cardsToUse && cardsToUse.length > 0) {
            const sequence = shuffleArray(cardsToUse);
            setReviewSequence(sequence);
        } else if (!isLoadingCards) { // Only reset if not loading and cardsToUse is empty/undefined
            setReviewSequence([]);
            setCurrentCardIndex(0);
        }
    }, [cardsToUse, isLoadingCards]);

    useEffect(() => {
        if (reviewSequence.length === 0) return;
        const normalizedIndex = Math.max(0, Math.min(reviewSequence.length - 1, desiredCardIndexFromParam));
        setCurrentCardIndex(prev => (prev === normalizedIndex ? prev : normalizedIndex));
    }, [desiredCardIndexFromParam, reviewSequence]);

    useEffect(() => {
        if (reviewSequence.length === 0) return;
        const totalCards = reviewSequence.length;
        const currentCardNumber = Math.min(currentCardIndex + 1, totalCards);
        const nextCardParam = String(currentCardNumber);
        if (cardParamRaw === nextCardParam) return;

        const params = new URLSearchParams(searchParams.toString());
        params.set('card', nextCardParam);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [cardParamRaw, currentCardIndex, reviewSequence.length, router, pathname, searchParams]);

    const handleReview = (result: ReviewResult) => {
        if (!reviewSequence || reviewSequence.length === 0 || deckId === undefined || createReviewMutation.isPending) return;
        const safeIndex = currentCardIndex;
        if (safeIndex >= reviewSequence.length) return;
        const cardId = reviewSequence[safeIndex].id;

        createReviewMutation.mutate({ cardId, deckId, result, wasFlipped: isFlipped }, {
            onSuccess: () => {
                const nextIndex = currentCardIndex + 1;
                setCurrentCardIndex(nextIndex);
            },
            onError: (err) => {
                alert(`Failed to record review: ${err.message}`);
            }
        });
    };

    const handlePlayAgain = () => {
        if (cardsToUse && cardsToUse.length > 0) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('card', '1');
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
            const sequence = shuffleArray(cardsToUse);
            setReviewSequence(sequence);
        }
        setCurrentCardIndex(0);
    } // Play again re-shuffles the currently loaded set (all or missed)

    const isLoading = isLoadingCards || isLoadingDeck;

    if (deckId === undefined) {
        return <div className="text-center text-red-500">Invalid Deck ID</div>;
    }

    if (playStrategy === 'missedInTimeframe' && (typeof timeframeDaysParsed !== 'number' || timeframeDaysParsed <= 0)) {
        return <div className="text-center text-red-500 p-4">Invalid timeframe specified for missed cards strategy.</div>;
    }

    if (isLoading && (!deck)) { // Only wait for deck if cards are also loading or not yet determined
        return (
            <div className="flex justify-center items-center py-10">
                <Spinner /> <span className="ml-2 text-gray-500">Loading deck...</span>
            </div>
        );
    }

    if (cardsError) {
        return <div className="text-center text-red-500 p-4 bg-red-50 rounded border border-red-200">Error loading cards: {(cardsError as Error).message || 'Unknown error'}.</div>;
    }

    // After loading and error checks, if no cards, show specific message
    if (!isLoading && (!reviewSequence || reviewSequence.length === 0)) {
        const emptyMessage = playStrategy === 'missedInTimeframe'
            ? `No cards found that were missed in the last ${timeframeDaysParsed} day(s).`
            : 'This deck is empty.';
        return (
            <div className="text-center py-10 space-y-4">
                <p className="text-gray-500">{emptyMessage}</p>
                <Link href={`/deck/${deckId}/overview`} passHref legacyBehavior>
                    <Button as="a" variant="default">Back to Overview</Button>
                </Link>
            </div>
        );
    }

    // If reviewSequence is still undefined/empty after all checks (should be caught above, but as a fallback)
    if (!reviewSequence) return <div className="text-center text-gray-500">Preparing cards...</div>;

    if (currentCardIndex >= reviewSequence.length && reviewSequence.length > 0) { // Added check for length > 0 to avoid flash of finished when loading
        return (
            <div className="text-center space-y-6 py-10">
                <p className="text-2xl font-semibold text-green-600">Deck finished!</p>
                <div className="flex flex-wrap justify-center gap-3">
                    <Button onClick={handlePlayAgain} variant="secondary">Play Again</Button>
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
    if (!currentCard && !isLoading) { // Only show loading card if not generally loading
        return <div className="text-center text-gray-500">Loading card...</div>;
    }
    if (!currentCard && isLoading) { // If generally loading and no current card yet, show main spinner
        return (
            <div className="flex justify-center items-center py-10">
                <Spinner /> <span className="ml-2 text-gray-500">Loading cards...</span>
            </div>
        );
    }
    if (!currentCard) return null; // Final fallback


    let strategyTitleSegment = '';
    if (playStrategy === 'missedInTimeframe') {
        strategyTitleSegment = `(Missed in last ${timeframeDaysParsed} days) `;
    }

    const totalCards = reviewSequence.length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <Link href={`/deck/${deckId}/overview`} className="text-sm text-primary hover:underline whitespace-nowrap sm:justify-self-start">
                    &larr; Overview
                </Link>
                <div className="text-center space-y-1 sm:justify-self-center">
                    <h1 className="text-lg sm:text-xl font-semibold text-gray-700">
                        Playing: <span className="text-primary font-bold">{deck?.name || '...'}</span> {strategyTitleSegment}{isFlipped ? '(Flipped)' : ''}
                    </h1>
                    <p className="text-sm font-medium text-gray-500">
                        Card {Math.min(currentCardIndex + 1, totalCards)} / {totalCards}
                    </p>
                </div>
                <div className="hidden sm:block sm:w-24" aria-hidden="true" />
            </div>
            <hr className="border-gray-300" />

            <CardReviewer
                card={currentCard}
                isFlipped={isFlipped}
                onReview={handleReview}
                isPendingReview={createReviewMutation.isPending}
                deckName={deck?.name}
            />
        </div>
    );
}
