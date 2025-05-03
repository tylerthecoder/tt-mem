'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useGenerateQuizMutation } from '@/hooks/queryHooks';
import type { QuizSet } from '@/types';
import QuizTopicInput from '@/components/QuizTopicInput';
import QuizPlayer, { type QuizResult } from '@/components/QuizPlayer'; // Import type
import Button from '@/components/Button';

// Enum to manage the page state
enum QuizPageState {
    TopicInput,
    QuizActive,
    Results,
}

export default function AIQuizPage() {
    const [pageState, setPageState] = useState<QuizPageState>(QuizPageState.TopicInput);
    const [activeQuizSet, setActiveQuizSet] = useState<QuizSet | null>(null);
    const [finalResults, setFinalResults] = useState<QuizResult[]>([]);

    const generateQuizMutation = useGenerateQuizMutation();

    const handleStartQuiz = (topic: string) => {
        generateQuizMutation.mutate({ topic }, {
            onSuccess: (data) => {
                setActiveQuizSet(data);
                setPageState(QuizPageState.QuizActive);
            },
            // Error handled by the component via mutation.error
        });
    };

    const handleQuizComplete = (results: QuizResult[]) => {
        setFinalResults(results);
        setPageState(QuizPageState.Results);
    };

    const handleTryAgain = () => {
        setPageState(QuizPageState.TopicInput);
        setActiveQuizSet(null);
        setFinalResults([]);
        generateQuizMutation.reset();
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-primary text-center">AI Quiz Generator</h1>

            {pageState === QuizPageState.TopicInput && (
                <QuizTopicInput
                    onStartQuiz={handleStartQuiz}
                    isLoading={generateQuizMutation.isPending}
                    error={generateQuizMutation.error?.message || null}
                />
            )}

            {pageState === QuizPageState.QuizActive && activeQuizSet && (
                <QuizPlayer
                    quizSetId={activeQuizSet.id}
                    topic={activeQuizSet.topic}
                    questions={activeQuizSet.questions}
                    onQuizComplete={handleQuizComplete}
                />
            )}

            {pageState === QuizPageState.Results && (
                <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow space-y-6">
                    <h2 className="text-2xl font-semibold text-center text-gray-800">Quiz Results</h2>
                    <p className="text-center text-lg">
                        You scored {finalResults.filter(r => r.isCorrect).length} / {finalResults.length}
                    </p>

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-700">Review Missed Questions:</h3>
                        {finalResults.filter(r => !r.isCorrect).length > 0 ? (
                            finalResults.filter(r => !r.isCorrect).map((result) => (
                                <div key={result.questionIndex} className="p-4 border border-red-200 bg-red-50 rounded">
                                    <p className="font-semibold text-gray-800">Q: {result.questionText}</p>
                                    <p className="text-sm text-red-600 mt-1">Your Answer: <span className="font-mono bg-red-100 px-1 rounded">{result.userAnswer}</span></p>
                                    <p className="text-sm text-green-700 mt-1">Correct Answer: <span className="font-medium">{result.correctAnswer}</span></p>
                                    {result.rationale && (
                                        <p className="text-xs text-gray-600 mt-1 italic">AI Rationale: {result.rationale}</p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500">You got everything correct!</p>
                        )}
                    </div>

                    <div className="flex flex-wrap justify-center gap-4 pt-4">
                        <Button onClick={handleTryAgain} variant="secondary">Try Another Topic</Button>
                        <Link href="/" passHref legacyBehavior>
                            <Button as="a" variant="default">Back to Decks</Button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}