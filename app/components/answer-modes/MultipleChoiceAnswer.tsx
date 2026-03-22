'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Card } from '@/types';
import Button from '@/components/Button';

interface MultipleChoiceAnswerProps {
    card: Card;
    onAnswer: (data: { is_correct: boolean; user_answer: string }) => void;
    isPending: boolean;
}

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export default function MultipleChoiceAnswer({ card, onAnswer, isPending }: MultipleChoiceAnswerProps) {
    const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

    const shuffledChoices = useMemo(() => {
        return shuffleArray(card.choices ?? []);
    }, [card.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setSelectedChoice(null);
    }, [card.id]);

    const isCorrect = selectedChoice !== null && selectedChoice === card.correct_answer;
    const answered = selectedChoice !== null;

    const handleSelect = (choice: string) => {
        if (answered) return;
        setSelectedChoice(choice);
    };

    const handleContinue = () => {
        if (!answered) return;
        onAnswer({
            is_correct: isCorrect,
            user_answer: selectedChoice,
        });
    };

    const getChoiceStyle = (choice: string): string => {
        if (!answered) {
            return 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-800';
        }
        if (choice === card.correct_answer) {
            return 'bg-green-100 border-2 border-green-500 text-green-800';
        }
        if (choice === selectedChoice && choice !== card.correct_answer) {
            return 'bg-red-100 border-2 border-red-500 text-red-800';
        }
        return 'bg-gray-100 border border-gray-200 text-gray-400';
    };

    return (
        <div className="space-y-3 pt-3 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-2">
                {shuffledChoices.map((choice, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSelect(choice)}
                        disabled={answered}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-center ${getChoiceStyle(choice)} ${!answered ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                        {choice}
                    </button>
                ))}
            </div>

            {answered && (
                <div className="flex items-center justify-between gap-3">
                    <div className="text-left">
                        <p className={`text-base font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                            {isCorrect ? 'Correct!' : 'Incorrect'}
                        </p>
                        {card.extra_context && (
                            <p className="text-xs text-gray-500 italic mt-0.5">{card.extra_context}</p>
                        )}
                    </div>
                    <Button onClick={handleContinue} variant="secondary" size="sm" disabled={isPending}>
                        {isPending ? 'Saving…' : 'Continue →'}
                    </Button>
                </div>
            )}
        </div>
    );
}
