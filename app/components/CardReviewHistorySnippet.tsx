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
        // Outer div is just a container now
        <div className="text-xs text-gray-500">
            {/* Inner div contains content and styling */}
            <div className="pt-3 mt-3 border-t border-gray-100">
                <p className="font-medium mb-1">Last Review:</p>
                {isLoading && (
                    <div className="space-y-1">
                        {/* Keep skeleton lines relatively narrow */}
                        <SkeletonLine width="w-3/4" height="h-3" />
                        <SkeletonLine width="w-1/2" height="h-3" />
                    </div>
                )}
                {!isLoading && error && (
                    <p className="text-red-500">Error loading history: {(error as Error).message}</p>
                )}
                {!isLoading && !error && !latestReview && (
                    <p>No review history found.</p>
                )}
                {!isLoading && !error && latestReview && (
                    <p>
                        <span className="font-semibold">{formatReviewResult(latestReview.result)}</span>
                        <span className="ml-2">({formatRelativeTime(latestReview.timestamp)})</span>
                    </p>
                )}
            </div>
        </div>
    );
}