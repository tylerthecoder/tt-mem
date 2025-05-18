'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/Button';
import { useCardsForReview, useCreateReviewEventMutation } from '@/hooks/queryHooks';
import { ReviewResult, Card } from '@/types';
import CardReviewer from '@/components/CardReviewer';
import Spinner from '@/components/Spinner';
import { useAuth } from '@/context/useAuth';

// Helper function to shuffle array (if not already in a utils file)
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function PlayPageContent() {
    const searchParams = useSearchParams();
    const { token, isLoading: isLoadingAuth } = useAuth();

    const strategyParam = searchParams.get('strategy');
    const limitParam = searchParams.get('limit');
    const isFlipped = searchParams.get('flipped') === 'true';
    const deckIdsParam = searchParams.get('deckIds'); // New: get deckIds from URL

    const strategy = (strategyParam === 'random' || strategyParam === 'missedFirst') ? strategyParam : 'random';
    const limit = parseInt(limitParam || '20', 10);
    const selectedDeckIds = deckIdsParam ? deckIdsParam.split(',').filter(id => id.trim() !== '') : undefined; // New: parse deckIds

    const { data: cards, isLoading: isLoadingCards, error: cardsError, refetch } = useCardsForReview({
        // deckId: undefined, // Explicitly not using single deckId here when deckIds might be present
        deckIds: selectedDeckIds, // New: pass selectedDeckIds
        limit,
        strategy,
        token: token ?? undefined, // Coalesce null to undefined
        enabled: !isLoadingAuth && !!token, // Only enable if auth is loaded and token exists
    });

    const createReviewMutation = useCreateReviewEventMutation();

    const [currentCardIndex, setCurrentCardIndex] = React.useState<number>(0);
    const [reviewSequence, setReviewSequence] = React.useState<Card[]>([]);

    React.useEffect(() => {
        if (cards && cards.length > 0) {
            // The hook already implements strategies like missedFirst or random sampling.
            // Shuffling here might be redundant if strategy is random, but okay for consistency or if strategy changes.
            setReviewSequence(shuffleArray(cards));
            setCurrentCardIndex(0);
        } else {
            setReviewSequence([]);
        }
    }, [cards]);

    const handleReview = (result: ReviewResult) => {
        if (!reviewSequence || reviewSequence.length === 0 || createReviewMutation.isPending) return;
        const safeIndex = currentCardIndex;
        if (safeIndex >= reviewSequence.length) return;

        const cardId = reviewSequence[safeIndex].id;
        // deckId for review event: if playing multiple decks, this might be ambiguous.
        // For now, using the card's actual deck_id. createReviewEventAction might need this.
        // Or, we decide not to pass deckId if it's a multi-deck session, and the action handles it.
        // Assuming createReviewEventAction can get deck_id from card_id or doesn't strictly need it if ambiguous.
        const cardDeckId = reviewSequence[safeIndex].deck_id;

        createReviewMutation.mutate({ cardId, deckId: cardDeckId, result }, {
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
        refetch(); // Refetch cards based on the same criteria
        setCurrentCardIndex(0);
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

    if (!isLoadingCards && (!reviewSequence || reviewSequence.length === 0)) {
        return (
            <div className="text-center space-y-6 py-10">
                <p className="text-lg text-gray-500">No cards found for this session.</p>
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
        // This case should ideally not be reached if reviewSequence is managed properly
        return <div className="text-center text-gray-500 py-10">Loading card...</div>;
    }

    const sessionTitle = selectedDeckIds ? "Playing Selected Decks" : "Playing All Decks";

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-4">
                <Link href={selectedDeckIds ? "/play/select" : "/"} className="text-sm text-primary hover:underline whitespace-nowrap">
                    &larr; {selectedDeckIds ? "Change Selection" : "My Decks"}
                </Link>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-700 text-center order-first sm:order-none">
                    {sessionTitle} {isFlipped ? '(Flipped)' : ''} (Strategy: {strategy})
                </h1>
                {/* Placeholder for potential future actions like 'Edit current card' if applicable */}
                <div></div> {/* Empty div for spacing, helps keep title centered */}
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
            // deckName might not be relevant if playing from multiple decks
            />
        </div>
    );
}

// Wrap with Suspense because useSearchParams() needs it.
export default function PlayPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[300px]"><Spinner /><p className="ml-2">Loading play session...</p></div>}>
            <PlayPageContent />
        </Suspense>
    );
}