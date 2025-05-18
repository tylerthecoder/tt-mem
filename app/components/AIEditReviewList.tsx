'use client';

import React, { useState, useEffect } from 'react';
import type { AICardEditSuggestion } from '@/types';
import AIEditSuggestionItem from './AIEditSuggestionItem';
import Button from './Button';
import Spinner from './Spinner';

interface AIEditReviewListProps {
    suggestions: AICardEditSuggestion[];
    onApplyEdits: (selectedEdits: AICardEditSuggestion[]) => void;
    onCancel: () => void;
    isApplying: boolean; // True if applyAIEditsMutation is pending
    applyError: string | null;
    applySuccessMessage?: string | null;
}

export default function AIEditReviewList({
    suggestions,
    onApplyEdits,
    onCancel,
    isApplying,
    applyError,
    applySuccessMessage
}: AIEditReviewListProps) {
    const [selectedIndices, setSelectedIndices] = useState<number[]>(() =>
        suggestions.map((_, index) => index) // Select all by default
    );

    // Reselect all if suggestions change (e.g., new prompt submitted)
    useEffect(() => {
        setSelectedIndices(suggestions.map((_, index) => index));
    }, [suggestions]);

    const handleToggleSelect = (index: number) => {
        setSelectedIndices(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const handleSelectAll = () => {
        setSelectedIndices(suggestions.map((_, index) => index));
    };

    const handleDeselectAll = () => {
        setSelectedIndices([]);
    };

    const handleApply = () => {
        const selectedEdits = suggestions.filter((_, index) => selectedIndices.includes(index));
        if (selectedEdits.length > 0) {
            onApplyEdits(selectedEdits);
        } else {
            alert("Please select at least one edit to apply.");
        }
    };

    if (suggestions.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow text-center">
                <p className="text-gray-600 mb-4">The AI did not suggest any changes for your request.</p>
                <Button variant="default" onClick={onCancel}>Back to Prompt</Button>
            </div>
        );
    }

    const allSelected = selectedIndices.length === suggestions.length;
    const noneSelected = selectedIndices.length === 0;

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">Review AI Edit Suggestions</h3>

            <div className="flex flex-wrap gap-2 mb-4 border-b pb-4">
                <Button variant="default" size="sm" onClick={handleSelectAll} disabled={allSelected || isApplying}>Select All</Button>
                <Button variant="default" size="sm" onClick={handleDeselectAll} disabled={noneSelected || isApplying}>Deselect All</Button>
            </div>

            <ul className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                {suggestions.map((suggestion, index) => (
                    <AIEditSuggestionItem
                        key={index} // Consider more stable key if suggestions can be reordered by AI (unlikely here)
                        suggestion={suggestion}
                        index={index}
                        isSelected={selectedIndices.includes(index)}
                        onToggleSelect={handleToggleSelect}
                    />
                ))}
            </ul>

            {applyError && (
                <div className="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded">
                    Error applying edits: {applyError}
                </div>
            )}
            {applySuccessMessage && (
                <div className="text-green-700 text-sm p-3 bg-green-50 border border-green-200 rounded">
                    {applySuccessMessage}
                </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <Button variant="default" onClick={onCancel} disabled={isApplying}>Cancel / Revise Prompt</Button>
                <Button
                    variant="primary"
                    onClick={handleApply}
                    disabled={isApplying || noneSelected || !!applySuccessMessage} // Disable if successfully applied
                >
                    {isApplying ? <><Spinner size="sm" /> Applying...</> : `Apply ${selectedIndices.length} Selected Edits`}
                </Button>
            </div>
        </div>
    );
}
