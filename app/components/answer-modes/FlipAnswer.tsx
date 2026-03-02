'use client';

import React, { useState, useEffect } from 'react';
import type { Card } from '@/types';
import { ReviewResult } from '@/types';
import Button from '@/components/Button';

interface FlipAnswerProps {
    card: Card;
    onAnswer: (data: { result: ReviewResult }) => void;
    isPending: boolean;
}

export default function FlipAnswer({ card, onAnswer, isPending }: FlipAnswerProps) {
    const [showAnswer, setShowAnswer] = useState(false);

    useEffect(() => {
        setShowAnswer(false);
    }, [card.id]);

    return (
        <div className="space-y-4">
            <div className="min-h-[3em] flex items-center justify-center">
                {showAnswer && (
                    <p className="text-xl sm:text-2xl text-secondary whitespace-pre-wrap">
                        {card.back_text}
                    </p>
                )}
            </div>
            <div className="pt-4 border-t border-gray-200 space-y-4">
                {showAnswer ? (
                    <div className="space-y-4">
                        {card.extra_context && (
                            <p className="text-sm text-gray-500 italic">{card.extra_context}</p>
                        )}
                        <p className="font-medium text-gray-700">How well did you know it?</p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <Button onClick={() => onAnswer({ result: ReviewResult.EASY })} variant="easy" size="sm" disabled={isPending}>Easy</Button>
                            <Button onClick={() => onAnswer({ result: ReviewResult.MEDIUM })} variant="medium" size="sm" disabled={isPending}>Medium</Button>
                            <Button onClick={() => onAnswer({ result: ReviewResult.HARD })} variant="hard" size="sm" disabled={isPending}>Hard</Button>
                            <Button onClick={() => onAnswer({ result: ReviewResult.MISSED })} variant="missed" size="sm" disabled={isPending}>Missed</Button>
                        </div>
                        {isPending && <p className="text-sm text-gray-500 pt-2">Recording...</p>}
                    </div>
                ) : (
                    <Button onClick={() => setShowAnswer(true)} variant="secondary" disabled={isPending}>
                        Show Answer
                    </Button>
                )}
            </div>
        </div>
    );
}
