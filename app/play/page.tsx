'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/Button';
import { useCardsForReview, useCreateReviewEventMutation } from '@/hooks/queryHooks';
import { Card } from '@/types';
import CardReviewer from '@/components/CardReviewer';
import type { AnswerData } from '@/components/answer-modes/AnswerModeDispatcher';
import Spinner from '@/components/Spinner';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/context/useAuth';
import { getOrCreatePlayOrder, reshuffleAndSave, clearPlayOrder, type PlayOrderKey } from '@/lib/playOrder';

function PlayPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { token, isLoading: isLoadingAuth } = useAuth();

    const strategyParam = searchParams.get('strategy');
    const limitParam = searchParams.get('limit');
    const deckIdsParam = searchParams.get('deckIds');
    const cardParamRaw = searchParams.get('card');

    const strategy = (strategyParam === 'random' || strategyParam === 'missedFirst') ? strategyParam : 'random';
    const limit = parseInt(limitParam || '20', 10);
    const selectedDeckIds = deckIdsParam ? deckIdsParam.split(',').filter(id => id.trim() !== '') : undefined;

    const orderKeyParams = useMemo<PlayOrderKey>(() => ({
        strategy,
        deckIds: selectedDeckIds,
    }), [strategy, selectedDeckIds]);

    const { data: cards, isLoading: isLoadingCards, error: cardsError, refetch } = useCardsForReview({
        deckIds: selectedDeckIds,
        limit,
        strategy,
        token: token ?? undefined,
        enabled: !isLoadingAuth && !!token,
    });

    const createReviewMutation = useCreateReviewEventMutation();

    const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
    const [reviewSequence, setReviewSequence] = useState<Card[]>([]);

    const desiredCardIndexFromParam = useMemo(() => {
        if (!cardParamRaw) return 0;
        const parsed = parseInt(cardParamRaw, 10);
        if (isNaN(parsed) || parsed < 1) return 0;
        return parsed - 1;
    }, [cardParamRaw]);

    useEffect(() => {
        if (cards && cards.length > 0) {
            setReviewSequence(getOrCreatePlayOrder(cards, orderKeyParams));
        } else {
            setReviewSequence([]);
            setCurrentCardIndex(0);
        }
    }, [cards, orderKeyParams]);

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
        if (reviewSequence.length === 0 || createReviewMutation.isPending) return;
        if (currentCardIndex >= reviewSequence.length) return;

        const currentCard = reviewSequence[currentCardIndex];

        createReviewMutation.mutate({
            cardId: currentCard.id,
            deckId: currentCard.deck_id,
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
        clearPlayOrder(orderKeyParams);
        setCurrentCardIndex(0);

        const p = new URLSearchParams(searchParams.toString());
        p.set('card', '1');
        router.replace(`${pathname}?${p.toString()}`, { scroll: false });

        refetch();
    };

    if (isLoadingAuth || (isLoadingCards && !cards)) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[300px]">
                <Spinner />
                <p className="mt-2 text-gray-500">{isLoadingAuth ? 'Authenticating...' : 'Loading cards...'}</p>
            </div>
        );
    }

    if (!token && !isLoadingAuth) {
        return (
            <div className="text-center py-10">
                <p className="mb-4 text-lg text-gray-700">You need to be logged in to play.</p>
                <Link href="/login" legacyBehavior passHref><Button as="a">Login</Button></Link>
            </div>
        );
    }

    if (cardsError) {
        return <div className="text-center text-red-500 p-4 bg-red-50 rounded border border-red-200">Error loading cards: {(cardsError as Error).message || 'Unknown error'}.</div>;
    }

    if (!isLoadingCards && reviewSequence.length === 0) {
        return (
            <div className="text-center space-y-6 py-10">
                <p className="text-lg text-gray-500">No cards found for this play through.</p>
                <p className="text-sm text-gray-400">
                    Try adjusting your strategy, selecting different decks, or adding more cards.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                    {selectedDeckIds && selectedDeckIds.length > 0 && (
                        <Link href="/play/select" passHref legacyBehavior>
                            <Button as="a" variant="secondary">Change Selected Decks</Button>
                        </Link>
                    )}
                    <Link href="/" passHref legacyBehavior>
                        <Button as="a" variant="default">Back to My Decks</Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (currentCardIndex >= reviewSequence.length) {
        return (
            <div className="text-center space-y-6 py-10">
                <p className="text-2xl font-semibold text-green-600">Session finished!</p>
                <div className="flex flex-wrap justify-center gap-3">
                    <Button onClick={handlePlayAgain} variant="secondary">Play Again (Same Settings)</Button>
                    {selectedDeckIds && selectedDeckIds.length > 0 && (
                        <Link href="/play/select" passHref legacyBehavior>
                            <Button as="a" variant="default">Play Different Decks</Button>
                        </Link>
                    )}
                    <Link href="/" passHref legacyBehavior>
                        <Button as="a" variant="default">Back to My Decks</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const currentCard = reviewSequence[currentCardIndex];
    if (!currentCard) {
        return <div className="text-center text-gray-500 py-10">Loading card...</div>;
    }

    const sessionTitle = selectedDeckIds ? 'Playing Selected Decks' : 'Playing All Decks';
    const totalCards = reviewSequence.length;

    return (
        <div className="space-y-6">
            <PageHeader
                title={sessionTitle}
                backHref={selectedDeckIds ? '/play/select' : '/decks'}
                backLabel={selectedDeckIds ? 'Change Selection' : 'Decks'}
                actions={
                    <>
                        <span className="text-sm text-gray-400 whitespace-nowrap">
                            {strategy}
                        </span>
                        <span className="text-sm font-medium text-gray-500">
                            Card {Math.min(currentCardIndex + 1, totalCards)} / {totalCards}
                        </span>
                    </>
                }
            />

            <CardReviewer
                card={currentCard}
                onReview={handleReview}
                isPendingReview={createReviewMutation.isPending}
            />
        </div>
    );
}

export default function PlayPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[300px]"><Spinner /><p className="ml-2">Loading play session...</p></div>}>
            <PlayPageContent />
        </Suspense>
    );
}
