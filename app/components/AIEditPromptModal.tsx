'use client';

import React, { useState } from 'react';
import Button from './Button';
import Spinner from './Spinner';

interface AIEditPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmitPrompt: (prompt: string) => void;
    isLoading: boolean;
    error: string | null;
}

export default function AIEditPromptModal({
    isOpen,
    onClose,
    onSubmitPrompt,
    isLoading,
    error,
}: AIEditPromptModalProps) {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isLoading) return;
        onSubmitPrompt(prompt.trim());
        // Optionally close modal on submit, or let parent decide
        // setPrompt(''); // Clear prompt after submit
    };

    const handleClose = () => {
        setPrompt(''); // Clear prompt on close
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900">AI Deck Edit Assistant</h2>
                    <Button variant="default" size="sm" onClick={handleClose} disabled={isLoading} className="!p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </Button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="ai-edit-prompt" className="block text-sm font-medium text-gray-700 mb-1">
                            Describe the changes you want to make:
                        </label>
                        <textarea
                            id="ai-edit-prompt"
                            rows={5}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., 'Add 5 more cards about cellular respiration.', 'Make all answers more concise.', 'Remove any cards related to glycolysis.'"
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

                    <div className="flex justify-end space-x-2 pt-2">
                        <Button type="button" variant="default" onClick={handleClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={isLoading || !prompt.trim()}>
                            {isLoading ? <><Spinner size="sm" /> Getting Suggestions...</> : 'Get Suggestions'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}