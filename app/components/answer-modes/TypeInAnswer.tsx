'use client';

import React, { useState, useEffect } from 'react';
import type { Card } from '@/types';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';
import { scoreAnswerAction } from '@/actions/scoring';
import { useAuth } from '@/context/useAuth';

interface TypeInAnswerProps {
    card: Card;
    onAnswer: (data: { is_correct: boolean; user_answer: string }) => void;
    isPending: boolean;
}

export default function TypeInAnswer({ card, onAnswer, isPending }: TypeInAnswerProps) {
    const { token } = useAuth();
    const [userInput, setUserInput] = useState('');
    const [isScoring, setIsScoring] = useState(false);
    const [feedback, setFeedback] = useState<{ is_correct: boolean; rationale?: string } | null>(null);

    useEffect(() => {
        setUserInput('');
        setFeedback(null);
        setIsScoring(false);
    }, [card.id]);

    const handleSubmit = async () => {
        if (!userInput.trim() || !card.correct_answer) return;
        setIsScoring(true);
        try {
            const result = await scoreAnswerAction(userInput.trim(), card.correct_answer, token ?? undefined);
            if (result.success && result.is_correct !== undefined) {
                setFeedback({ is_correct: result.is_correct, rationale: result.rationale });
            } else {
                // Fallback to exact match
                const isCorrect = userInput.trim().toLowerCase() === card.correct_answer.toLowerCase();
                setFeedback({ is_correct: isCorrect });
            }
        } catch {
            const isCorrect = userInput.trim().toLowerCase() === (card.correct_answer || '').toLowerCase();
            setFeedback({ is_correct: isCorrect });
        } finally {
            setIsScoring(false);
        }
    };

    const handleContinue = () => {
        if (!feedback) return;
        onAnswer({ is_correct: feedback.is_correct, user_answer: userInput.trim() });
    };

    return (
        <div className="space-y-3 pt-3 border-t border-gray-100">
            {!feedback ? (
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                        placeholder="Type your answer..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-center text-base focus:ring-2 focus:ring-primary focus:border-primary"
                        disabled={isScoring}
                        autoFocus
                    />
                    <Button
                        onClick={handleSubmit}
                        variant="secondary"
                        size="sm"
                        disabled={!userInput.trim() || isScoring}
                    >
                        {isScoring ? <><Spinner size="sm" /> </> : 'Submit'}
                    </Button>
                </div>
            ) : (
                <div className="flex items-start justify-between gap-3">
                    <div className={`flex-1 px-3 py-2 rounded-lg text-left text-sm ${feedback.is_correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <p className={`font-semibold ${feedback.is_correct ? 'text-green-700' : 'text-red-700'}`}>
                            {feedback.is_correct ? 'Correct!' : 'Incorrect'}
                        </p>
                        {!feedback.is_correct && card.correct_answer && (
                            <p className="text-xs text-gray-600 mt-0.5">
                                Answer: <span className="font-medium text-green-700">{card.correct_answer}</span>
                            </p>
                        )}
                        {feedback.rationale && (
                            <p className="text-xs text-gray-500 mt-1 italic">{feedback.rationale}</p>
                        )}
                        {card.extra_context && (
                            <p className="text-xs text-gray-500 mt-1 italic">{card.extra_context}</p>
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
