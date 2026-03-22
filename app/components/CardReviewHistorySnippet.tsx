'use client';

import React from 'react';
import { useLatestReviewForCard } from '@/hooks/queryHooks';
import SkeletonLine from './SkeletonLine';
import { formatDistanceToNow } from 'date-fns'; // Using date-fns for nice relative time

interface CardReviewHistorySnippetProps {
    cardId: string;
}

// Helper to format ReviewResult nicely
function formatReviewResult(result: string | undefined): string {
    if (!result) return 'N/A';
    return result.charAt(0).toUpperCase() + result.slice(1);
}

export default function CardReviewHistorySnippet({ cardId }: CardReviewHistorySnippetProps) {
    const { data: latestReview, isLoading, error } = useLatestReviewForCard(cardId);

    // Date formatting function
    const formatRelativeTime = (date: Date | undefined): string => {
        if (!date) return '';
        try {
            // Ensure date is a Date object
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            return formatDistanceToNow(dateObj, { addSuffix: true });
        } catch (e) {
            console.error('Error formatting date:', e);
            return 'Invalid date';
        }
    };

    return (
        <div className="border-t border-gray-100 pt-2 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <span>Last review:</span>
            {isLoading && <SkeletonLine width="w-20" height="h-3" />}
            {!isLoading && error && <span className="text-red-400">unavailable</span>}
            {!isLoading && !error && !latestReview && <span>none</span>}
            {!isLoading && !error && latestReview && (
                <>
                    <span className="font-medium text-gray-500">{formatReviewResult(latestReview.result)}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(latestReview.timestamp)}</span>
                </>
            )}
        </div>
    );
}