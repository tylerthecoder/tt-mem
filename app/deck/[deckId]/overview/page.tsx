'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDeck, useDeckReviewHistory, useDeckCards, useLastReviewResults } from '@/hooks/queryHooks';
import Button from '@/components/Button';
import { ReviewResult } from '@/types';
import { formatDistanceToNow } from 'date-fns';

const getDifficultyScore = (result: ReviewResult | undefined): number => {
    if (!result) return 1;
    switch (result) {
        case ReviewResult.MISSED: return 4;
        case ReviewResult.HARD: return 3;
        case ReviewResult.MEDIUM: return 2;
        case ReviewResult.EASY: return 1;
        default: return 1;
    }
};

function getResultColor(result: ReviewResult | undefined): string {
    if (!result) return 'text-gray-500';
    switch (result) {
        case ReviewResult.EASY: return 'text-green-600';
        case ReviewResult.MEDIUM: return 'text-blue-600';
        case ReviewResult.HARD: return 'text-orange-600';
        case ReviewResult.MISSED: return 'text-red-600';
        default: return 'text-gray-600';
    }
}

export default function DeckOverviewPage() {
    const params = useParams();
    const router = useRouter();
    const deckId = typeof params?.deckId === 'string' ? params.deckId : undefined;

    const [flipCards, setFlipCards] = useState(false);
    const [randomizeOrder, setRandomizeOrder] = useState(false);
    const [viewMode, setViewMode] = useState<'history' | 'difficulty'>('history');

    const { data: deck, isLoading: deckLoading, error: deckError } = useDeck(deckId);
    const { data: history, isLoading: historyLoading, error: historyError } = useDeckReviewHistory(deckId);
    const { data: cards, isLoading: cardsLoading, error: cardsError } = useDeckCards(deckId);
    const { data: lastReviewResults, isLoading: lastReviewLoading, error: lastReviewError } = useLastReviewResults(deckId);

    const difficultySortedSequence = useMemo(() => {
        if (!cards || !lastReviewResults) return [];
        return [...cards].sort((a, b) => {
            const scoreA = getDifficultyScore(lastReviewResults.get(a.id)?.lastResult);
            const scoreB = getDifficultyScore(lastReviewResults.get(b.id)?.lastResult);
            if (scoreB !== scoreA) return scoreB - scoreA;
            return a.id.localeCompare(b.id);
        });
    }, [cards, lastReviewResults]);

    const activeCardViewSequence = useMemo(() => {
        return viewMode === 'difficulty' ? difficultySortedSequence : (cards ?? []);
    }, [viewMode, cards, difficultySortedSequence]);

    const handleStartPlaying = () => {
        const queryParams = new URLSearchParams();
        if (flipCards) queryParams.set('flipped', 'true');
        if (randomizeOrder) queryParams.set('randomize', 'true');
        const queryString = queryParams.toString();
        const playUrl = `/deck/${deckId}/play${queryString ? `?${queryString}` : ''}`;
        router.push(playUrl);
    };

    if (deckId === undefined) {
        return <div className="text-center text-red-500">Invalid Deck ID</div>;
    }

    // Handle combined errors
    let errorMessage: string | null = null;
    if (deckError) errorMessage = deckError instanceof Error ? deckError.message : 'Error loading deck info';
    else if (cardsError) errorMessage = cardsError instanceof Error ? cardsError.message : 'Error loading cards';
    else if (historyError) errorMessage = historyError instanceof Error ? historyError.message : 'Error loading review history';
    else if (lastReviewError) errorMessage = lastReviewError instanceof Error ? lastReviewError.message : 'Error loading last review results';

    if (errorMessage) {
        return <div className="text-center text-red-500">Error: {errorMessage}</div>;
    }

    if ((deckLoading || cardsLoading) && (!deck || !cards)) {
        return <div className="text-center text-gray-500">Loading deck information...</div>;
    }

    if (!deck) {
        return <div className="text-center text-red-500">Deck not found.</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-primary break-words">{deck.name} - Overview</h1>
                    <p className="text-gray-600 mt-1">Review cards, view history, and start playing.</p>
                </div>
                <Link href={`/deck/${deckId}/edit`} passHref legacyBehavior>
                    <Button as="a" variant="default" className="flex-shrink-0 w-full sm:w-auto">Edit Deck</Button>
                </Link>
            </div>
            <hr className="border-gray-300" />

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow space-y-4">
                <h2 className="text-xl font-semibold text-gray-800">Play Options</h2>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-3 sm:space-y-0">
                    <div className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            id="flip-cards-checkbox"
                            checked={flipCards}
                            onChange={(e) => setFlipCards(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-1"
                        />
                        <label htmlFor="flip-cards-checkbox" className="text-sm font-medium text-gray-700 select-none">
                            Flip Cards (Show Back First)
                        </label>
                    </div>
                    <div className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            id="randomize-checkbox"
                            checked={randomizeOrder}
                            onChange={(e) => setRandomizeOrder(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-1"
                        />
                        <label htmlFor="randomize-checkbox" className="text-sm font-medium text-gray-700 select-none">
                            Randomize Order
                        </label>
                    </div>
                </div>
                <div className="pt-2">
                    <Button onClick={handleStartPlaying} variant="primary" className="w-full sm:w-auto">
                        Start Playing
                    </Button>
                </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Card Overview</h2>
                    <div className="inline-flex rounded-md shadow-sm self-end sm:self-center" role="group">
                        <Button
                            variant={viewMode === 'history' ? 'default' : 'secondary'}
                            onClick={() => setViewMode('history')}
                            size="sm"
                            className="rounded-r-none focus:ring-offset-0"
                            disabled={cardsLoading}
                        >
                            Default Order {cardsLoading ? '...' : ''}
                        </Button>
                        <Button
                            variant={viewMode === 'difficulty' ? 'default' : 'secondary'}
                            onClick={() => setViewMode('difficulty')}
                            size="sm"
                            className="rounded-l-none focus:ring-offset-0"
                            disabled={cardsLoading || lastReviewLoading || !lastReviewResults}
                        >
                            By Difficulty {lastReviewLoading ? '...' : ''}
                        </Button>
                    </div>
                </div>

                {(cardsLoading || lastReviewLoading) && !activeCardViewSequence.length && <div className="text-center text-gray-500 py-4">Loading cards...</div>}
                {(!cardsLoading && !lastReviewLoading && activeCardViewSequence.length === 0) && <div className="text-center text-gray-500 py-4">No cards in this deck. <Link href={`/deck/${deckId}/edit`} className="text-primary underline hover:text-red-700">Add some!</Link></div>}
                {activeCardViewSequence.length > 0 && (
                    <div className="overflow-x-auto border border-gray-200 rounded-md">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Front</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Back</th>
                                    {viewMode === 'difficulty' && (
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Last Review</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {activeCardViewSequence.map((card) => {
                                    const lastResult = lastReviewResults?.get(card.id);
                                    return (
                                        <tr key={card.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-pre-wrap text-sm text-gray-800">{card.front_text}</td>
                                            <td className="px-4 py-3 whitespace-pre-wrap text-sm text-gray-800">{card.back_text}</td>
                                            {viewMode === 'difficulty' && (
                                                <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${getResultColor(lastResult?.lastResult)}`}>
                                                    {lastResult ? (
                                                        <span className="flex items-center">
                                                            {lastResult.lastResult} <span className="text-gray-500 text-xs ml-1.5">({formatDistanceToNow(new Date(lastResult.timestamp), { addSuffix: true })})</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500">Never Reviewed</span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Full Review History Section (Restored with styling) */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Full Review History</h2>
                {historyLoading && <div className="text-center text-gray-500 py-4">Loading history...</div>}
                {historyError && (
                    <div className="text-center text-red-500 p-3 bg-red-50 rounded border border-red-200">
                        Error loading history: {historyError instanceof Error ? historyError.message : 'Unknown error'}
                    </div>
                )}
                {!historyLoading && !historyError && (
                    history && history.length > 0 ? (
                        <div className="overflow-x-auto border border-gray-200 rounded-md">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Card Front</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Result</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Reviewed</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {history.map((entry) => (
                                        <tr key={entry.eventId} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-pre-wrap text-sm text-gray-800">{entry.cardFront}</td>
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
                        <p className="text-center text-gray-500 py-4">No review history found for this deck yet.</p>
                    )
                )}
            </div>
        </div>
    );
}