'use client';

import React, { useState } from 'react';
import type { QuestionAnswerPair } from '@/types';
import { useScoreQuizAnswerMutation } from '@/hooks/queryHooks';
import Button from './Button';
import Spinner from './Spinner';

interface QuizPlayerProps {
    quizSetId: string;
    topic: string;
    questions: QuestionAnswerPair[];
    onQuizComplete: (results: QuizResult[]) => void; // Callback when quiz finishes
}

// Type to store result for each question
export interface QuizResult {
    questionIndex: number;
    questionText: string;
    correctAnswer: string;
    userAnswer: string;
    isCorrect: boolean;
    rationale?: string;
}

export default function QuizPlayer({ quizSetId, topic, questions, onQuizComplete }: QuizPlayerProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [results, setResults] = useState<QuizResult[]>([]);
    const [showFeedback, setShowFeedback] = useState(false);
    const [lastScoreResult, setLastScoreResult] = useState<{ is_correct: boolean; rationale?: string } | null>(null);

    const scoreMutation = useScoreQuizAnswerMutation();

    const currentQuestion = questions[currentQuestionIndex];

    const handleSubmitAnswer = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentAnswer.trim() || scoreMutation.isPending) return;

        setShowFeedback(false); // Hide previous feedback
        setLastScoreResult(null);

        scoreMutation.mutate(
            {
                quizSetId: quizSetId,
                questionIndex: currentQuestionIndex,
                userAnswer: currentAnswer.trim(),
            },
            {
                onSuccess: (data) => {
                    const result: QuizResult = {
                        questionIndex: currentQuestionIndex,
                        questionText: currentQuestion.question_text,
                        correctAnswer: currentQuestion.answer_text,
                        userAnswer: currentAnswer.trim(),
                        isCorrect: data.is_correct,
                        rationale: data.llm_rationale,
                    };
                    setResults(prev => [...prev, result]);
                    setLastScoreResult({ is_correct: data.is_correct, rationale: data.llm_rationale });
                    setShowFeedback(true);
                },
                onError: (error) => {
                    // Show error feedback to user
                    alert(`Error scoring answer: ${error.message}`);
                    // Optionally allow retry?
                },
            }
        );
    };

    const handleNextQuestion = () => {
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < questions.length) {
            setCurrentQuestionIndex(nextIndex);
            setCurrentAnswer(''); // Clear input for next question
            setShowFeedback(false); // Hide feedback
            setLastScoreResult(null);
            scoreMutation.reset(); // Reset mutation state if needed
        } else {
            // Quiz finished
            onQuizComplete(results);
        }
    };

    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    return (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow space-y-6">
            <h2 className="text-xl font-semibold text-center text-gray-800">Quiz: {topic}</h2>
            <p className="text-sm text-center text-gray-500 font-medium">Question {currentQuestionIndex + 1} / {questions.length}</p>

            {/* Question Display */}
            <div className="p-4 bg-gray-50 rounded border border-gray-200">
                <p className="text-lg font-medium text-gray-900 whitespace-pre-wrap">{currentQuestion.question_text}</p>
            </div>

            {/* Answer Form (shown when not showing feedback) */}
            {!showFeedback && (
                <form onSubmit={handleSubmitAnswer} className="space-y-4">
                    <div>
                        <label htmlFor="user-answer" className="block text-sm font-medium text-gray-700 mb-1">Your Answer</label>
                        <textarea
                            id="user-answer"
                            rows={3}
                            value={currentAnswer}
                            onChange={(e) => setCurrentAnswer(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                            disabled={scoreMutation.isPending}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" variant="secondary" disabled={scoreMutation.isPending || !currentAnswer.trim()}>
                            {scoreMutation.isPending ? <><Spinner size="sm" /> Submitting...</> : 'Submit Answer'}
                        </Button>
                    </div>
                </form>
            )}

            {/* Feedback Area (shown after submitting) */}
            {showFeedback && lastScoreResult && (
                <div className={`p-4 rounded border ${lastScoreResult.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <h3 className={`text-lg font-semibold ${lastScoreResult.is_correct ? 'text-green-700' : 'text-red-700'}`}>
                        {lastScoreResult.is_correct ? 'Correct!' : 'Incorrect'}
                    </h3>
                    {!lastScoreResult.is_correct && (
                        <p className="text-sm text-gray-700 mt-2">Correct Answer: <span className="font-medium">{currentQuestion.answer_text}</span></p>
                    )}
                    {lastScoreResult.rationale && (
                        <p className="text-xs text-gray-600 mt-2 italic">AI Rationale: {lastScoreResult.rationale}</p>
                    )}
                    <div className="mt-4 flex justify-end">
                        <Button onClick={handleNextQuestion} variant="primary">
                            {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
                        </Button>
                    </div>
                </div>
            )}

            {/* General Mutation Error Display (e.g., network issue) */}
            {scoreMutation.isError && !showFeedback && (
                <div className="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded">
                    Error: {scoreMutation.error.message}
                </div>
            )}
        </div>
    );
}