'use client';

import React, { useState } from 'react';
import Button from './Button';
import Spinner from './Spinner';

interface QuizTopicInputProps {
    onStartQuiz: (topic: string) => void; // Callback when topic is submitted
    isLoading: boolean;
    error: string | null;
}

export default function QuizTopicInput({ onStartQuiz, isLoading, error }: QuizTopicInputProps) {
    const [topic, setTopic] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim() || isLoading) return;
        onStartQuiz(topic.trim());
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow space-y-4">
            <h2 className="text-xl font-semibold text-center text-gray-800 mb-4">Enter a Topic to Learn</h2>
            <div>
                <label htmlFor="quiz-topic" className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <input
                    id="quiz-topic"
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Photosynthesis, React Hooks, The Roman Empire"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    disabled={isLoading}
                />
            </div>

            {error && (
                <div className="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded">
                    Error: {error}
                </div>
            )}

            <div className="flex justify-center pt-2">
                <Button type="submit" variant="primary" disabled={isLoading || !topic.trim()}>
                    {isLoading ? <><Spinner size="sm" /> Generating Quiz...</> : 'Start Quiz'}
                </Button>
            </div>
        </form>
    );
}