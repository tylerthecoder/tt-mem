'use client';

import React from 'react';
import Link from 'next/link';
import type { Card } from '@/types';
import FrontContentRenderer from './front-content/FrontContentRenderer';
import AnswerModeDispatcher, { type AnswerData } from './answer-modes/AnswerModeDispatcher';
import CardReviewHistorySnippet from './CardReviewHistorySnippet';

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
}: CardReviewerProps) {
    return (
        <div className="bg-white px-4 pt-5 pb-4 rounded-xl shadow-md text-center flex flex-col gap-4 relative">
            {/* Edit card icon link */}
            <Link
                href={`/card/${card.id}/edit`}
                className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 transition-colors"
                title="Edit card"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
            </Link>

            {/* Question / front content */}
            <div className="flex flex-col items-center justify-center">
                <FrontContentRenderer card={card} />
            </div>

            {/* Answer area */}
            <AnswerModeDispatcher
                card={card}
                onAnswer={onReview}
                isPending={isPendingReview}
            />

            {/* History — compact single line */}
            <CardReviewHistorySnippet cardId={card.id} />
        </div>
    );
}
