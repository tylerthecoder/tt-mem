'use client';

import React from 'react';
import type { Card } from '@/types';
import { FrontContentType } from '@/types';
import WorldMap from '@/components/map/WorldMap';

interface FrontContentRendererProps {
    card: Card;
}

export default function FrontContentRenderer({ card }: FrontContentRendererProps) {
    const contentType = card.front_content_type ?? FrontContentType.TEXT;

    switch (contentType) {
        case FrontContentType.IMAGE:
            return (
                <div className="space-y-2">
                    {card.front_image_url && (
                        <img
                            src={card.front_image_url}
                            alt={card.front_text}
                            className="max-w-full max-h-44 mx-auto rounded-lg object-contain border border-gray-200 shadow-sm"
                        />
                    )}
                    <p className="text-lg sm:text-xl font-medium text-gray-900 whitespace-pre-wrap">
                        {card.front_text}
                    </p>
                </div>
            );

        case FrontContentType.MAP_HIGHLIGHT:
            return (
                <div className="space-y-2">
                    <p className="text-lg sm:text-xl font-medium text-gray-900 whitespace-pre-wrap">
                        {card.front_text}
                    </p>
                    <WorldMap highlightedCountryCode={card.front_map_country_code} />
                </div>
            );

        case FrontContentType.TEXT:
        default:
            return (
                <p className="text-2xl sm:text-3xl font-medium text-gray-900 whitespace-pre-wrap">
                    {card.front_text}
                </p>
            );
    }
}
