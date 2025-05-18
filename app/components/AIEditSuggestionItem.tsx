'use client';

import React from 'react';
import type { AICardEditSuggestion } from '@/types';
import Button from './Button'; // Assuming Button can be used for small actions

interface AIEditSuggestionItemProps {
    suggestion: AICardEditSuggestion;
    index: number;
    isSelected: boolean;
    onToggleSelect: (index: number) => void;
    // currentCards: Card[]; // Potentially needed to display original text for updates/deletes
}

const EditTypeBadge: React.FC<{ type: AICardEditSuggestion['type'] }> = ({ type }) => {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-700';
    let borderColor = 'border-gray-300';

    switch (type) {
        case 'create':
            bgColor = 'bg-green-100';
            textColor = 'text-green-700';
            borderColor = 'border-green-300';
            break;
        case 'update':
            bgColor = 'bg-blue-100';
            textColor = 'text-blue-700';
            borderColor = 'border-blue-300';
            break;
        case 'delete':
            bgColor = 'bg-red-100';
            textColor = 'text-red-700';
            borderColor = 'border-red-300';
            break;
    }
    return (
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${bgColor} ${textColor} ${borderColor}`}>
            {type.toUpperCase()}
        </span>
    );
};

export default function AIEditSuggestionItem({ suggestion, index, isSelected, onToggleSelect }: AIEditSuggestionItemProps) {

    const renderSuggestionDetails = () => {
        switch (suggestion.type) {
            case 'create':
                return (
                    <div className="space-y-1">
                        <p><span className="font-semibold">Front:</span> {suggestion.front_text}</p>
                        <p><span className="font-semibold">Back:</span> {suggestion.back_text}</p>
                        {suggestion.extra_context && <p><span className="font-semibold">Context:</span> {suggestion.extra_context}</p>}
                    </div>
                );
            case 'update':
                return (
                    <div className="space-y-1">
                        <p><span className="font-semibold">Card ID:</span> <span className="font-mono text-xs">{suggestion.cardId}</span></p>
                        {/* TODO: Consider fetching and showing original card text for comparison if cardId exists */}
                        {suggestion.front_text && <p><span className="font-semibold">New Front:</span> {suggestion.front_text}</p>}
                        {suggestion.back_text && <p><span className="font-semibold">New Back:</span> {suggestion.back_text}</p>}
                        {suggestion.extra_context && <p><span className="font-semibold">New Context:</span> {suggestion.extra_context}</p>}
                    </div>
                );
            case 'delete':
                return (
                    <div className="space-y-1">
                        <p><span className="font-semibold">Card ID:</span> <span className="font-mono text-xs">{suggestion.cardId}</span></p>
                        {/* TODO: Consider fetching and showing original card text to confirm deletion target */}
                        <p className="text-red-600">This card will be permanently deleted.</p>
                    </div>
                );
            default:
                return <p>Unknown edit type.</p>;
        }
    };

    return (
        <li className={`p-4 rounded-md border flex items-start gap-4 ${isSelected ? 'bg-blue-50 border-blue-300 shadow-md' : 'bg-white border-gray-200'}`}>
            <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(index)}
                className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <div className="flex-grow space-y-2">
                <EditTypeBadge type={suggestion.type} />
                <div className="text-sm text-gray-700">
                    {renderSuggestionDetails()}
                </div>
            </div>
        </li>
    );
}