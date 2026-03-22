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
        <div className="space-y-3 pt-3 border-t border-gray-100">
            {showAnswer ? (
                <>
                    <p className="text-xl sm:text-2xl text-secondary whitespace-pre-wrap">
                        {card.answer_content as string}
                    </p>
                    {card.extra_context && (
                        <p className="text-xs text-gray-500 italic">{card.extra_context}</p>
                    )}
                    <div>
                        <p className="text-xs font-medium text-gray-400 mb-2">How well did you know it?</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            <Button onClick={() => onAnswer({ result: ReviewResult.EASY })} variant="easy" size="sm" disabled={isPending}>Easy</Button>
                            <Button onClick={() => onAnswer({ result: ReviewResult.MEDIUM })} variant="medium" size="sm" disabled={isPending}>Medium</Button>
                            <Button onClick={() => onAnswer({ result: ReviewResult.HARD })} variant="hard" size="sm" disabled={isPending}>Hard</Button>
                            <Button onClick={() => onAnswer({ result: ReviewResult.MISSED })} variant="missed" size="sm" disabled={isPending}>Missed</Button>
                        </div>
                    </div>
                </>
            ) : (
                <Button onClick={() => setShowAnswer(true)} variant="secondary" disabled={isPending}>
                    Show Answer
                </Button>
            )}
        </div>
    );
}
