'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';
import { generateReadingContentAction, submitReadingAttemptAction, updateAnswerScoreAction } from '@/actions/readingComprehension';
import type { ReadingSession } from '@/types';

interface TopicInputProps {
    onTopicSubmit: (topic: string) => void;
    isLoading: boolean;
}

function TopicInput({ onTopicSubmit, isLoading }: TopicInputProps) {
    const [topic, setTopic] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (topic.trim()) {
            onTopicSubmit(topic.trim());
        }
    };

    return (
        <div className="max-w-md mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Reading Comprehension Test</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
                        Enter a topic for reading comprehension:
                    </label>
                    <input
                        id="topic"
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., Space exploration, Climate change, Ancient Rome..."
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                        disabled={isLoading}
                    />
                </div>
                <Button 
                    type="submit" 
                    variant="primary" 
                    size="base" 
                    disabled={isLoading || !topic.trim()}
                    className="w-full"
                >
                    {isLoading ? 'Generating Content...' : 'Generate Reading Content'}
                </Button>
            </form>
            <div className="mt-6 text-center">
                <Link href="/" className="text-primary underline hover:text-red-700">
                    ← Back to Home
                </Link>
            </div>
        </div>
    );
}

interface ReadingViewProps {
    session: ReadingSession;
    onReadingComplete: (timeMs: number) => void;
}

function ReadingView({ session, onReadingComplete }: ReadingViewProps) {
    const [hasStarted, setHasStarted] = useState(false);
    const [isReading, setIsReading] = useState(false);
    const startTimeRef = useRef<number>(0);

    const handleStart = () => {
        setHasStarted(true);
        setIsReading(true);
        startTimeRef.current = Date.now();
    };

    const handleDone = () => {
        const endTime = Date.now();
        const readingTime = endTime - startTimeRef.current;
        setIsReading(false);
        onReadingComplete(readingTime);
    };

    if (!hasStarted) {
        return (
            <div className="max-w-2xl mx-auto text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">Ready to Read</h1>
                <p className="text-gray-600 mb-6">
                    Topic: <span className="font-semibold">{session.topic}</span>
                </p>
                <p className="text-gray-600 mb-8">
                    When you click "Start", a passage will appear and a timer will begin. 
                    Read the passage carefully, then click "Done" when you finish reading. 
                    You'll then answer questions about the passage.
                </p>
                <Button variant="primary" size="base" onClick={handleStart}>
                    Start Reading
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-gray-800">Reading: {session.topic}</h1>
                {isReading && (
                    <p className="text-primary font-medium mt-2">Timer is running... Read carefully!</p>
                )}
            </div>
            
            {isReading && (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-6">
                    <div className="prose prose-lg max-w-none">
                        <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {session.passage}
                        </div>
                    </div>
                </div>
            )}

            <div className="text-center">
                <Button 
                    variant="primary" 
                    size="base" 
                    onClick={handleDone}
                    disabled={!isReading}
                >
                    Done Reading
                </Button>
            </div>
        </div>
    );
}

interface QuestionAnswerProps {
    session: ReadingSession;
    readingTimeMs: number;
    onComplete: () => void;
}

function QuestionAnswer({ session, readingTimeMs, onComplete }: QuestionAnswerProps) {
    const [answers, setAnswers] = useState<{ [index: number]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [results, setResults] = useState<{
        total_score: number;
        answers: {
            question_index: number;
            user_answer: string;
            is_correct: boolean;
            correct_answer: string;
        }[];
        attempt_id: string;
    } | null>(null);

    const handleAnswerChange = (questionIndex: number, answer: string) => {
        setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
    };

    const handleSubmit = async () => {
        const answerArray = session.questions.map((_, index) => ({
            question_index: index,
            user_answer: answers[index] || '',
        }));

        setIsSubmitting(true);
        try {
            const result = await submitReadingAttemptAction(session.id, readingTimeMs, answerArray);
            if (result.success && result.attempt) {
                setResults({
                    total_score: result.attempt.total_score,
                    answers: result.attempt.answers,
                    attempt_id: result.attempt.id,
                });
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error('Failed to submit answers:', error);
            alert('Failed to submit answers. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOverride = async (questionIndex: number, newIsCorrect: boolean) => {
        if (!results) return;

        try {
            const result = await updateAnswerScoreAction(results.attempt_id, questionIndex, newIsCorrect);
            if (result.success) {
                // Update local results
                setResults(prev => {
                    if (!prev) return prev;
                    const updatedAnswers = prev.answers.map(answer => 
                        answer.question_index === questionIndex
                            ? { ...answer, is_correct: newIsCorrect }
                            : answer
                    );
                    const newTotalScore = updatedAnswers.filter(answer => answer.is_correct).length;
                    return {
                        ...prev,
                        answers: updatedAnswers,
                        total_score: newTotalScore,
                    };
                });
            } else {
                alert(`Error updating score: ${result.message}`);
            }
        } catch (error) {
            console.error('Failed to update score:', error);
            alert('Failed to update score. Please try again.');
        }
    };

    const allAnswered = session.questions.every((_, index) => answers[index]?.trim());
    const readingTimeSeconds = Math.round(readingTimeMs / 1000);

    if (results) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Results</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-4 bg-primary/10 rounded-lg">
                            <div className="text-2xl font-bold text-primary">{results.total_score}/{session.questions.length}</div>
                            <div className="text-sm text-gray-600">Score</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{readingTimeSeconds}s</div>
                            <div className="text-sm text-gray-600">Reading Time</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{Math.round((results.total_score / session.questions.length) * 100)}%</div>
                            <div className="text-sm text-gray-600">Accuracy</div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    {results.answers.map((result, index) => (
                        <div key={index} className={`p-4 rounded-lg border ${result.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <div className="font-medium text-gray-800 mb-2">
                                Q{index + 1}: {session.questions[index].question_text}
                            </div>
                            <div className="text-sm space-y-1">
                                <div>
                                    <span className="font-medium">Your answer:</span> {result.user_answer}
                                </div>
                                <div>
                                    <span className="font-medium">Correct answer:</span> {result.correct_answer}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${result.is_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {result.is_correct ? 'Correct' : 'Incorrect'}
                                    </span>
                                    {!result.is_correct && (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => handleOverride(index, true)}
                                        >
                                            Mark as Correct
                                        </Button>
                                    )}
                                    {result.is_correct && (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => handleOverride(index, false)}
                                        >
                                            Mark as Incorrect
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center space-x-4">
                    <Button variant="primary" size="base" onClick={onComplete}>
                        Try Another Topic
                    </Button>
                    <Link href="/" passHref legacyBehavior>
                        <Button as="a" variant="default" size="base">Back to Home</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Answer the Questions</h2>
                <p className="text-gray-600">
                    Reading time: {readingTimeSeconds} seconds
                </p>
            </div>

            <div className="space-y-6 mb-8">
                {session.questions.map((question, index) => (
                    <div key={index} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                        <div className="font-medium text-gray-800 mb-3">
                            {index + 1}. {question.question_text}
                        </div>
                        <input
                            type="text"
                            value={answers[index] || ''}
                            onChange={(e) => handleAnswerChange(index, e.target.value)}
                            placeholder="Enter your answer..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                        />
                    </div>
                ))}
            </div>

            <div className="text-center">
                <Button
                    variant="primary"
                    size="base"
                    onClick={handleSubmit}
                    disabled={!allAnswered || isSubmitting}
                >
                    {isSubmitting ? <><Spinner /> Submitting...</> : 'Submit Answers'}
                </Button>
            </div>
        </div>
    );
}

export default function ReadingComprehensionPage() {
    const [currentSession, setCurrentSession] = useState<ReadingSession | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [readingTimeMs, setReadingTimeMs] = useState(0);
    const [phase, setPhase] = useState<'topic' | 'reading' | 'questions'>('topic');

    const handleTopicSubmit = async (topic: string) => {
        setIsLoading(true);
        try {
            const result = await generateReadingContentAction(topic);
            if (result.success && result.session) {
                setCurrentSession(result.session);
                setPhase('reading');
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error('Failed to generate content:', error);
            alert('Failed to generate reading content. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReadingComplete = (timeMs: number) => {
        setReadingTimeMs(timeMs);
        setPhase('questions');
    };

    const handleQuizComplete = () => {
        setCurrentSession(null);
        setReadingTimeMs(0);
        setPhase('topic');
    };

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen">
            {phase === 'topic' && (
                <TopicInput onTopicSubmit={handleTopicSubmit} isLoading={isLoading} />
            )}
            {phase === 'reading' && currentSession && (
                <ReadingView session={currentSession} onReadingComplete={handleReadingComplete} />
            )}
            {phase === 'questions' && currentSession && (
                <QuestionAnswer
                    session={currentSession}
                    readingTimeMs={readingTimeMs}
                    onComplete={handleQuizComplete}
                />
            )}
        </div>
    );
}