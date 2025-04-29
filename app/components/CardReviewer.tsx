'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { Card } from '@/types';
import { ReviewResult } from '@/types';
import Button from '@/components/Button';
import CardReviewHistorySnippet from './CardReviewHistorySnippet';

interface CardReviewerProps {
    card: Card;
    isFlipped: boolean;
    onReview: (result: ReviewResult) => void;
    isPendingReview: boolean;
    deckName?: string; // Optional: To show which deck the card is from
}

export default function CardReviewer({
    card,
    isFlipped,
    onReview,
    isPendingReview,
    deckName,
}: CardReviewerProps) {
    const [showTarget, setShowTarget] = useState<boolean>(false);

    const handleShowTarget = () => {
        setShowTarget(true);
    };

    const initialText = isFlipped ? card.back_text : card.front_text;
    const targetText = isFlipped ? card.front_text : card.back_text;

    // Reset showTarget when the card changes
    React.useEffect(() => {
        setShowTarget(false);
    }, [card.id]);

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg text-center space-y-6 min-h-[300px] sm:min-h-[350px] flex flex-col justify-between">
            <div>
                {/* Optional: Show deck name if provided */}
                {deckName && (
                    <p className="text-sm text-gray-400 mb-1">From: {deckName}</p>
                )}
                <p className="text-2xl sm:text-3xl font-medium mb-4 min-h-[3em] flex items-center justify-center whitespace-pre-wrap text-gray-900">
                    {initialText}
                </p>
            </div>
            <div className="space-y-4">
                <div className="min-h-[3em] flex items-center justify-center">
                    {showTarget && (
                        <p className="text-xl sm:text-2xl text-secondary whitespace-pre-wrap">
                            {targetText}
                        </p>
                    )}
                </div>
                <div className="pt-4 border-t border-gray-200 space-y-4">
                    {showTarget ? (
                        <div className="space-y-4">
                            <p className="font-medium text-gray-700">How well did you know it?</p>
                            <div className="flex flex-wrap justify-center gap-3">
                                <Button onClick={() => onReview(ReviewResult.EASY)} variant="easy" size="sm" disabled={isPendingReview}>Easy</Button>
                                <Button onClick={() => onReview(ReviewResult.MEDIUM)} variant="medium" size="sm" disabled={isPendingReview}>Medium</Button>
                                <Button onClick={() => onReview(ReviewResult.HARD)} variant="hard" size="sm" disabled={isPendingReview}>Hard</Button>
                                <Button onClick={() => onReview(ReviewResult.MISSED)} variant="missed" size="sm" disabled={isPendingReview}>Missed</Button>
                            </div>
                            {isPendingReview && <p className="text-sm text-gray-500 pt-2">Recording...</p>}
                        </div>
                    ) : (
                        <Button onClick={handleShowTarget} variant="secondary" disabled={isPendingReview}>Show {isFlipped ? 'Front' : 'Back'}</Button>
                    )}
                    {/* Edit Button */}
                    <div className="pt-2">
                        <Link href={`/card/${card.id}/edit`} passHref legacyBehavior>
                            <Button as="a" variant="default" size="sm" className="text-xs">Edit Card</Button>
                        </Link>
                    </div>
                    {/* Last Review Snippet */}
                    <CardReviewHistorySnippet cardId={card.id} />
                </div>
            </div>
        </div>
    );
}