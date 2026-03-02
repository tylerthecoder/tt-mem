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
    const [userInput, setUserInput] = useState('');
    const [isScoring, setIsScoring] = useState(false);
    const [feedback, setFeedback] = useState<{ is_correct: boolean; rationale?: string } | null>(null);
    const { token } = useAuth();

    useEffect(() => {
        setUserInput('');
        setFeedback(null);
        setIsScoring(false);
    }, [card.id]);

    const handleSubmit = async () => {
        if (!userInput.trim() || !card.correct_answer) return;
        setIsScoring(true);
        try {
            const result = await scoreAnswerAction(userInput.trim(), card.correct_answer, token);
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
        <div className="space-y-4 pt-4 border-t border-gray-200">
            {!feedback ? (
                <div className="space-y-3">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                        placeholder="Type your answer..."
                        className="w-full p-3 border border-gray-300 rounded-lg text-center text-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        disabled={isScoring}
                        autoFocus
                    />
                    <Button
                        onClick={handleSubmit}
                        variant="secondary"
                        disabled={!userInput.trim() || isScoring}
                        className="w-full sm:w-auto"
                    >
                        {isScoring ? <><Spinner size="sm" /> Checking...</> : 'Submit'}
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className={`p-4 rounded-lg ${feedback.is_correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <p className={`text-lg font-semibold ${feedback.is_correct ? 'text-green-700' : 'text-red-700'}`}>
                            {feedback.is_correct ? 'Correct!' : 'Incorrect'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                            Your answer: <span className="font-medium">{userInput}</span>
                        </p>
                        {!feedback.is_correct && card.correct_answer && (
                            <p className="text-sm text-gray-600 mt-1">
                                Correct answer: <span className="font-medium text-green-700">{card.correct_answer}</span>
                            </p>
                        )}
                        {feedback.rationale && (
                            <p className="text-xs text-gray-500 mt-2 italic">{feedback.rationale}</p>
                        )}
                    </div>
                    {card.extra_context && (
                        <p className="text-sm text-gray-500 italic">{card.extra_context}</p>
                    )}
                    <Button onClick={handleContinue} variant="secondary" disabled={isPending}>
                        {isPending ? 'Recording...' : 'Continue'}
                    </Button>
                </div>
            )}
        </div>
    );
}
