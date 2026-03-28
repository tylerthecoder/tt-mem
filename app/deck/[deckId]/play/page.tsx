'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
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
import { Card } from '@/types';
import CardReviewer from '@/components/CardReviewer';
import type { AnswerData } from '@/components/answer-modes/AnswerModeDispatcher';
import Spinner from '@/components/Spinner';
import PageHeader from '@/components/PageHeader';
import { getOrCreatePlayOrder, reshuffleAndSave, type PlayOrderKey } from '@/lib/playOrder';

function PlayDeckPageContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const deckId = typeof params?.deckId === 'string' ? params.deckId : undefined;
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
        if (isNaN(parsed) || parsed < 1) return 0;
        return parsed - 1;
    }, [cardParamRaw]);

    const orderKeyParams = useMemo<PlayOrderKey>(() => ({
        deckId,
        strategy: playStrategy,
        timeframe: timeframeDaysParsed,
    }), [deckId, playStrategy, timeframeDaysParsed]);

    const { token } = useAuth();

    const allCardsQuery = useDeckCards(deckId);
    const missedCardsQuery = useMissedCardsForDeckInTimeframe({
        deckId,
        timeframeDays: timeframeDaysParsed,
        token: token ?? undefined,
        enabled: playStrategy === 'missedInTimeframe' && !!deckId && !!timeframeDaysParsed && timeframeDaysParsed > 0 && !!token,
    });

    const cardsToUse = useMemo(() => {
        if (playStrategy === 'missedInTimeframe') return missedCardsQuery.data;
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
            setReviewSequence(getOrCreatePlayOrder(cardsToUse, orderKeyParams));
        } else if (!isLoadingCards) {
            setReviewSequence([]);
            setCurrentCardIndex(0);
        }
    }, [cardsToUse, isLoadingCards, orderKeyParams]);

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

        const p = new URLSearchParams(searchParams.toString());
        p.set('card', nextCardParam);
        router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    }, [cardParamRaw, currentCardIndex, reviewSequence.length, router, pathname, searchParams]);

    const handleReview = (data: AnswerData) => {
        if (reviewSequence.length === 0 || deckId === undefined || createReviewMutation.isPending) return;
        if (currentCardIndex >= reviewSequence.length) return;
        const currentCard = reviewSequence[currentCardIndex];

        createReviewMutation.mutate({
            cardId: currentCard.id,
            deckId,
            result: data.result,
            is_correct: data.is_correct,
            answer_type: currentCard.answer_type,
            user_answer: data.user_answer,
        }, {
            onSuccess: () => {
                setCurrentCardIndex(currentCardIndex + 1);
            },
            onError: (err) => {
                alert(`Failed to record review: ${err.message}`);
            }
        });
    };

    const handlePlayAgain = () => {
        if (!cardsToUse || cardsToUse.length === 0) return;
        const sequence = reshuffleAndSave(cardsToUse, orderKeyParams);
        setReviewSequence(sequence);
        setCurrentCardIndex(0);

        const p = new URLSearchParams(searchParams.toString());
        p.set('card', '1');
        router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    };

    const isLoading = isLoadingCards || isLoadingDeck;

    if (deckId === undefined) {
        return <div className="text-center text-red-500">Invalid Deck ID</div>;
    }

    if (playStrategy === 'missedInTimeframe' && (typeof timeframeDaysParsed !== 'number' || timeframeDaysParsed <= 0)) {
        return <div className="text-center text-red-500 p-4">Invalid timeframe specified for missed cards strategy.</div>;
    }

    if (isLoading && !deck) {
        return (
            <div className="flex justify-center items-center py-10">
                <Spinner /> <span className="ml-2 text-gray-500">Loading deck...</span>
            </div>
        );
    }

    if (cardsError) {
        return <div className="text-center text-red-500 p-4 bg-red-50 rounded border border-red-200">Error loading cards: {(cardsError as Error).message || 'Unknown error'}.</div>;
    }

    if (!isLoading && reviewSequence.length === 0) {
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

    if (currentCardIndex >= reviewSequence.length && reviewSequence.length > 0) {
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
    if (!currentCard) {
        return (
            <div className="flex justify-center items-center py-10">
                <Spinner /> <span className="ml-2 text-gray-500">Loading cards...</span>
            </div>
        );
    }

    const strategyTitleSegment = playStrategy === 'missedInTimeframe'
        ? `(Missed in last ${timeframeDaysParsed} days)`
        : '';

    const totalCards = reviewSequence.length;

    return (
        <div className="flex flex-col gap-3" style={{ minHeight: 'calc(100dvh - 8rem)' }}>
            <PageHeader
                title={deck?.name || 'Deck review'}
                backHref={`/deck/${deckId}/overview`}
                backLabel="Overview"
                actions={
                    <>
                        {strategyTitleSegment && (
                            <span className="text-sm text-gray-400 whitespace-nowrap">
                                {strategyTitleSegment}
                            </span>
                        )}
                        <span className="text-sm font-medium text-gray-500 whitespace-nowrap">
                            {Math.min(currentCardIndex + 1, totalCards)} / {totalCards}
                        </span>
                    </>
                }
            />

            {/* Progress bar */}
            <div className="w-full h-1 bg-gray-200 rounded-full flex-shrink-0">
                <div
                    className="h-1 bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${((currentCardIndex) / totalCards) * 100}%` }}
                />
            </div>

            <div className="flex-1">
                <CardReviewer
                    card={currentCard}
                    onReview={handleReview}
                    isPendingReview={createReviewMutation.isPending}
                />
            </div>
        </div>
    );
}

export default function PlayDeckPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[300px]"><Spinner /><p className="ml-2">Loading play session...</p></div>}>
            <PlayDeckPageContent />
        </Suspense>
    );
}
