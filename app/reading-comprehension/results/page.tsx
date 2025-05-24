'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';
import { getPastReadingResultsAction } from '@/actions/readingComprehension';
import type { ReadingSession, ReadingAttempt } from '@/types';

interface ReadingResult {
    session: ReadingSession;
    attempt: ReadingAttempt;
}

export default function ReadingComprehensionResultsPage() {
    const [results, setResults] = useState<ReadingResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const response = await getPastReadingResultsAction();
                if (response.success && response.results) {
                    setResults(response.results);
                } else {
                    setError(response.message || 'Failed to load results');
                }
            } catch (err) {
                console.error('Failed to fetch results:', err);
                setError('Failed to load results');
            } finally {
                setIsLoading(false);
            }
        };

        fetchResults();
    }, []);

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 min-h-screen">
                <div className="text-center">
                    <Spinner />
                    <p className="mt-4 text-gray-600">Loading your reading comprehension results...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8 min-h-screen">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">Reading Comprehension Results</h1>
                    <p className="text-red-600 mb-6">{error}</p>
                    <Link href="/reading-comprehension">
                        <Button variant="primary">← Back to Reading Comprehension</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const formatReadingTime = (timeMs: number) => {
        const seconds = Math.round(timeMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${seconds}s`;
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Reading Comprehension Results</h1>
                    <Link href="/reading-comprehension">
                        <Button variant="default">← Back to Reading Comprehension</Button>
                    </Link>
                </div>

                {results.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-600 mb-6">No reading comprehension attempts found.</p>
                        <Link href="/reading-comprehension">
                            <Button variant="primary">Start Your First Reading Test</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {results.map((result, index) => (
                            <div key={result.attempt.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Left: Basic Info */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                            {result.session.topic}
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-3">
                                            Completed: {formatDate(result.attempt.createdAt)}
                                        </p>
                                        <div className="space-y-1 text-sm">
                                            <div>Reading Time: <span className="font-medium">{formatReadingTime(result.attempt.reading_time_ms)}</span></div>
                                        </div>
                                    </div>

                                    {/* Center: Score Metrics */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center p-3 bg-primary/10 rounded-lg">
                                            <div className="text-xl font-bold text-primary">
                                                {result.attempt.total_score}/{result.session.questions.length}
                                            </div>
                                            <div className="text-xs text-gray-600">Score</div>
                                        </div>
                                        <div className="text-center p-3 bg-green-50 rounded-lg">
                                            <div className="text-xl font-bold text-green-600">
                                                {Math.round((result.attempt.total_score / result.session.questions.length) * 100)}%
                                            </div>
                                            <div className="text-xs text-gray-600">Accuracy</div>
                                        </div>
                                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                                            <div className="text-xl font-bold text-blue-600">
                                                {formatReadingTime(result.attempt.reading_time_ms)}
                                            </div>
                                            <div className="text-xs text-gray-600">Time</div>
                                        </div>
                                    </div>

                                    {/* Right: Answer Breakdown */}
                                    <div>
                                        <h4 className="font-medium text-gray-800 mb-2">Answer Breakdown</h4>
                                        <div className="space-y-1">
                                            {result.attempt.answers.map((answer, answerIndex) => (
                                                <div key={answerIndex} className="flex items-center text-sm">
                                                    <span className="w-8">Q{answerIndex + 1}:</span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                        answer.is_correct 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {answer.is_correct ? '✓' : '✗'}
                                                    </span>
                                                    {answer.overridden && (
                                                        <span className="ml-1 text-xs text-orange-600">(Override)</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Expandable Details */}
                                <details className="mt-4">
                                    <summary className="cursor-pointer text-sm text-primary hover:text-red-700">
                                        View Details
                                    </summary>
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <div className="mb-4">
                                            <h5 className="font-medium text-gray-800 mb-2">Passage:</h5>
                                            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md max-h-40 overflow-y-auto">
                                                {result.session.passage}
                                            </div>
                                        </div>
                                        <div>
                                            <h5 className="font-medium text-gray-800 mb-2">Questions & Answers:</h5>
                                            <div className="space-y-3">
                                                {result.session.questions.map((question, qIndex) => {
                                                    const userAnswer = result.attempt.answers.find(a => a.question_index === qIndex);
                                                    return (
                                                        <div key={qIndex} className="text-sm border-l-2 border-gray-200 pl-3">
                                                            <div className="font-medium text-gray-800 mb-1">
                                                                Q{qIndex + 1}: {question.question_text}
                                                            </div>
                                                            <div className="text-gray-600">
                                                                <div>Your answer: <span className="font-medium">{userAnswer?.user_answer || 'No answer'}</span></div>
                                                                <div>Correct answer: <span className="font-medium text-green-700">{question.correct_answer}</span></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </details>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}