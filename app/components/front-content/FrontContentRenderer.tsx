'use client';

import React from 'react';
import type { Card } from '@/types';
import WorldMap from '@/components/map/WorldMap';

interface FrontContentRendererProps {
    card: Card;
}

export default function FrontContentRenderer({ card }: FrontContentRendererProps) {
    const promptType = card.prompt_type ?? 'text';

    switch (promptType) {
        case 'image':
            return (
                <div className="space-y-2">
                    {card.prompt_content && (
                        <img
                            src={card.prompt_content}
                            alt={card.prompt_text ?? ''}
                            className="max-w-full max-h-44 mx-auto rounded-lg object-contain border border-gray-200 shadow-sm"
                        />
                    )}
                    <p className="text-lg sm:text-xl font-medium text-gray-900 whitespace-pre-wrap">
                        {card.prompt_text}
                    </p>
                </div>
            );

        case 'map':
            return (
                <div className="space-y-2">
                    <p className="text-lg sm:text-xl font-medium text-gray-900 whitespace-pre-wrap">
                        {card.prompt_text}
                    </p>
                    <WorldMap highlightedCountryCode={card.prompt_content} />
                </div>
            );

        case 'text':
        default:
            return (
                <p className="text-2xl sm:text-3xl font-medium text-gray-900 whitespace-pre-wrap">
                    {card.prompt_content}
                </p>
            );
    }
}
