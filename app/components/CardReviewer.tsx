'use client';

import React from 'react';
import Link from 'next/link';
import type { Card } from '@/types';
import { AnswerMode } from '@/types';
import Button from '@/components/Button';
import CardReviewHistorySnippet from './CardReviewHistorySnippet';
import FrontContentRenderer from './front-content/FrontContentRenderer';
import AnswerModeDispatcher, { type AnswerData } from './answer-modes/AnswerModeDispatcher';

interface CardReviewerProps {
    card: Card;
    onReview: (data: AnswerData) => void;
    isPendingReview: boolean;
    deckName?: string;
}

export default function CardReviewer({
    card,
    onReview,
    isPendingReview,
    deckName,
}: CardReviewerProps) {
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg text-center space-y-6 min-h-[300px] sm:min-h-[350px] flex flex-col justify-between">
            <div>
                {deckName && (
                    <p className="text-sm text-gray-400 mb-1">From: {deckName}</p>
                )}
                <FrontContentRenderer card={card} />
            </div>
            <div className="space-y-4">
                <AnswerModeDispatcher
                    card={card}
                    onAnswer={onReview}
                    isPending={isPendingReview}
                />
                <div className="pt-2">
                    <Link href={`/card/${card.id}/edit`} passHref legacyBehavior>
                        <Button as="a" variant="default" size="sm" className="text-xs">Edit Card</Button>
                    </Link>
                </div>
                <CardReviewHistorySnippet cardId={card.id} />
            </div>
        </div>
    );
}
