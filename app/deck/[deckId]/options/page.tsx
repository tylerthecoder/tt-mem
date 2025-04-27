'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Add useRouter
import Link from 'next/link';
import { useDeck, useDeckReviewHistory } from '@/hooks/queryHooks';
import Button from '@/components/Button';
import { ReviewResult } from '@/types'; // For coloring history
import { formatDistanceToNow } from 'date-fns'; // For relative timestamps

function getResultColor(result: ReviewResult): string {
    switch (result) {
        case ReviewResult.EASY: return 'text-green-600';
        case ReviewResult.MEDIUM: return 'text-blue-600';
        case ReviewResult.HARD: return 'text-orange-600';
        case ReviewResult.MISSED: return 'text-red-600';
        default: return 'text-gray-600';
    }
}

export default function DeckOptionsPage() {
    const params = useParams();
    const router = useRouter(); // Hook for navigation
    const deckId = typeof params?.deckId === 'string' ? params.deckId : undefined;

    const [flipCards, setFlipCards] = useState(false);

    const { data: deck, isLoading: deckLoading, error: deckError } = useDeck(deckId);
    const { data: history, isLoading: historyLoading, error: historyError } = useDeckReviewHistory(deckId);

    const handleStartPlaying = () => {
        const playUrl = `/deck/${deckId}/play${flipCards ? '?flipped=true' : ''}`;
        router.push(playUrl); // Navigate to play screen
    };

    if (deckId === undefined) {
        return <div className="text-center text-red-500">Invalid Deck ID</div>;
    }

    if (deckLoading) return <div className="text-center text-gray-500">Loading deck...</div>;
    if (deckError) {
        const message = deckError instanceof Error ? deckError.message : 'Unknown error loading deck';
        return <div className="text-center text-red-500">Error: {message}</div>;
    }
    if (!deck) {
        return <div className="text-center text-red-500">Deck not found.</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-primary truncate">{deck.name} - Options & History</h1>
                    <p className="text-gray-600 mt-1">Configure how you want to play and review your past performance.</p>
                </div>
                <Link href={`/deck/${deckId}/edit`} passHref legacyBehavior>
                    <Button as="a" variant="default">Edit Deck</Button>
                </Link>
            </div>
            <hr className="border-gray-300" />

            {/* Play Options */}
            <div className="bg-white p-6 rounded shadow space-y-4">
                <h2 className="text-xl font-semibold text-gray-800">Play Options</h2>
                <div className="flex items-center space-x-3">
                    <input
                        type="checkbox"
                        id="flip-cards-checkbox"
                        checked={flipCards}
                        onChange={(e) => setFlipCards(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="flip-cards-checkbox" className="text-sm font-medium text-gray-700">
                        Flip Cards (Show Back First)
                    </label>
                </div>
                <Button onClick={handleStartPlaying} variant="primary" className="w-full sm:w-auto">
                    Start Playing
                </Button>
            </div>

            {/* Review History */}
            <div className="bg-white p-6 rounded shadow">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Review History</h2>
                {historyLoading && <div className="text-center text-gray-500">Loading history...</div>}
                {historyError && (
                    <div className="text-center text-red-500">
                        Error loading history: {historyError instanceof Error ? historyError.message : 'Unknown error'}
                    </div>
                )}
                {!historyLoading && !historyError && (
                    history && history.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Card Front</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reviewed</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {history.map((entry) => (
                                        <tr key={entry.eventId}>
                                            <td className="px-4 py-3 whitespace-pre-wrap text-sm text-gray-900">{entry.cardFront}</td>
                                            <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${getResultColor(entry.result)}`}>{entry.result}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                {entry.timestamp ? formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true }) : 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500">No review history found for this deck yet.</p>
                    )
                )}
            </div>

        </div>
    );
}