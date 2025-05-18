'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    useDeck,
    useDeckReviewHistory,
    useDeckCards,
    useGetAIEditSuggestionsMutation,
    useApplyAIEditsMutation,
    useUpdateDeckMutation,
    useDeleteCardMutation,
    useUpdateCardMutation
} from '@/hooks/queryHooks';
import Button from '@/components/Button';
import { ReviewResult, type AICardEditSuggestion, type Card } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import AIEditPromptModal from '@/components/AIEditPromptModal';
import AIEditReviewList from '@/components/AIEditReviewList';
import { useAuth } from '@/context/useAuth';
import Spinner from '@/components/Spinner';

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
    const { token } = useAuth();

    const [flipCards, setFlipCards] = useState(false);
    const [playStrategy, setPlayStrategy] = useState<'all' | 'missedInTimeframe'>('all');
    const [timeframeDays, setTimeframeDays] = useState<number>(7);

    const [isAIPromptModalOpen, setIsAIPromptModalOpen] = useState(false);
    const [aiEditSuggestions, setAiEditSuggestions] = useState<AICardEditSuggestion[]>([]);
    const [isAIReviewListOpen, setIsAIReviewListOpen] = useState(false);
    const [currentAIPrompt, setCurrentAIPrompt] = useState('');

    const [isEditingDeckName, setIsEditingDeckName] = useState(false);
    const [newDeckName, setNewDeckName] = useState('');

    const [editingCard, setEditingCard] = useState<Card | null>(null);
    const [editCardFront, setEditCardFront] = useState('');
    const [editCardBack, setEditCardBack] = useState('');

    const { data: deck, isLoading: deckLoading, error: deckError, refetch: refetchDeckInfo } = useDeck(deckId);
    const { data: history, isLoading: historyLoading, error: historyError } = useDeckReviewHistory(deckId);
    const { data: cards, isLoading: cardsLoading, error: cardsError, refetch: refetchDeckCards } = useDeckCards(deckId);

    const getAIEditsMutation = useGetAIEditSuggestionsMutation();
    const applyAIEditsMutation = useApplyAIEditsMutation();
    const updateDeckNameMutation = useUpdateDeckMutation();
    const deleteCardMutation = useDeleteCardMutation();
    const updateCardMutation = useUpdateCardMutation();

    useEffect(() => {
        if (deck) {
            setNewDeckName(deck.name);
        }
    }, [deck]);

    const handleStartPlaying = () => {
        const queryParams = new URLSearchParams();
        if (flipCards) queryParams.set('flipped', 'true');

        queryParams.set('strategy', playStrategy);
        if (playStrategy === 'missedInTimeframe') {
            if (timeframeDays > 0) {
                queryParams.set('timeframe', timeframeDays.toString());
            } else {
                alert('Please enter a valid number of days for the timeframe.');
                return;
            }
        }
        const queryString = queryParams.toString();
        const playUrl = `/deck/${deckId}/play${queryString ? `?${queryString}` : ''}`;
        router.push(playUrl);
    };

    const handleAIPromptSubmit = (prompt: string) => {
        if (!deckId || !token) return;
        setCurrentAIPrompt(prompt);
        setAiEditSuggestions([]);
        setIsAIPromptModalOpen(false);
        getAIEditsMutation.mutate({ deckId, userPrompt: prompt, token }, {
            onSuccess: (data) => {
                if (data.success && data.suggestions) {
                    setAiEditSuggestions(data.suggestions);
                    if (data.suggestions.length > 0) {
                        setIsAIReviewListOpen(true);
                    } else {
                        alert('AI did not find any suggestions for that prompt.');
                    }
                } else {
                    alert(`Failed to get AI suggestions: ${data.message || 'Unknown error'}`);
                }
            },
            onError: (error) => {
                alert(`Error getting AI suggestions: ${error.message}`);
            }
        });
    };

    const handleApplySelectedAIEdits = (selectedEdits: AICardEditSuggestion[]) => {
        if (!deckId || !token || selectedEdits.length === 0) return;
        applyAIEditsMutation.mutate({ deckId, edits: selectedEdits, token }, {
            onSuccess: (data) => {
                alert(data.message || `Applied ${data.appliedCount} edits, ${data.failedCount} failed.`);
                if (data.appliedCount > 0) {
                    refetchDeckCards();
                    refetchDeckInfo();
                }
                setIsAIReviewListOpen(false);
                setAiEditSuggestions([]);
            },
            onError: (error) => {
                alert(`Error applying AI edits: ${error.message}`);
            }
        });
    };

    const handleUpdateDeckName = async () => {
        if (!deckId || !newDeckName.trim() || !token || newDeckName.trim() === deck?.name) {
            setIsEditingDeckName(false);
            if (deck) setNewDeckName(deck.name);
            return;
        }
        updateDeckNameMutation.mutate({ deckId, name: newDeckName.trim(), token }, {
            onSuccess: () => {
                alert('Deck name updated successfully!');
                setIsEditingDeckName(false);
                refetchDeckInfo();
            },
            onError: (error) => {
                alert(`Failed to update deck name: ${error.message}`);
                if (deck) setNewDeckName(deck.name);
            }
        });
    };

    const handleDeleteCard = (cardIdToDelete: string) => {
        if (!deckId || !token) return;
        if (window.confirm('Are you sure you want to delete this card permanently?')) {
            deleteCardMutation.mutate({ cardId: cardIdToDelete, deckId, token }, {
                onSuccess: () => {
                    alert('Card deleted successfully.');
                    refetchDeckCards();
                },
                onError: (error) => {
                    alert(`Failed to delete card: ${error.message}`);
                }
            });
        }
    };

    const openEditCardModal = (card: Card) => {
        setEditingCard(card);
        setEditCardFront(card.front_text);
        setEditCardBack(card.back_text);
    };

    const handleUpdateCard = () => {
        if (!editingCard || !deckId || !token) return;
        if (!editCardFront.trim() || !editCardBack.trim()) {
            alert('Front and back text cannot be empty.');
            return;
        }
        updateCardMutation.mutate({
            cardId: editingCard.id,
            deckId,
            frontText: editCardFront,
            backText: editCardBack,
            token
        }, {
            onSuccess: () => {
                alert('Card updated successfully!');
                setEditingCard(null);
                refetchDeckCards();
            },
            onError: (error) => {
                alert(`Failed to update card: ${error.message}`);
            }
        });
    };

    if (deckId === undefined) {
        return <div className="text-center text-red-500">Invalid Deck ID</div>;
    }

    let errorMessage: string | null = null;
    if (deckError) errorMessage = deckError instanceof Error ? deckError.message : 'Error loading deck info';
    else if (cardsError) errorMessage = cardsError instanceof Error ? cardsError.message : 'Error loading cards';
    else if (historyError) errorMessage = historyError instanceof Error ? historyError.message : 'Error loading review history';

    if (errorMessage) {
        return <div className="text-center text-red-500 p-4 bg-red-50 rounded border border-red-200">Error: {errorMessage}</div>;
    }

    if ((deckLoading || cardsLoading) && (!deck || !cards)) {
        return (
            <div className="flex justify-center items-center min-h-[300px]">
                <Spinner size="base" />
            </div>
        );
    }

    if (!deck) {
        return <div className="text-center text-red-500">Deck not found.</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                {!isEditingDeckName ? (
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-bold text-primary break-words">{deck.name}</h1>
                        <Button onClick={() => { setNewDeckName(deck.name); setIsEditingDeckName(true); }} variant="default" size="sm" className="p-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 flex-grow">
                        <input
                            type="text"
                            value={newDeckName}
                            onChange={(e) => setNewDeckName(e.target.value)}
                            className="text-2xl sm:text-3xl font-bold text-primary border-b-2 border-primary focus:outline-none flex-grow p-0.5"
                            autoFocus
                            onBlur={handleUpdateDeckName}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateDeckName(); if (e.key === 'Escape') setIsEditingDeckName(false); }}
                        />
                        <Button onClick={handleUpdateDeckName} variant="secondary" size="sm" disabled={updateDeckNameMutation.isPending || newDeckName.trim() === deck.name || !newDeckName.trim()}>
                            {updateDeckNameMutation.isPending ? <Spinner size="sm" /> : 'Save'}
                        </Button>
                        <Button onClick={() => { setIsEditingDeckName(false); setNewDeckName(deck.name); }} variant="default" size="sm" disabled={updateDeckNameMutation.isPending}>Cancel</Button>
                    </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 w-full sm:w-auto">
                    <Button
                        onClick={() => setIsAIPromptModalOpen(true)}
                        variant="secondary"
                        className="w-full sm:w-auto"
                        disabled={!cards || cards.length === 0 || getAIEditsMutation.isPending || applyAIEditsMutation.isPending || !token}
                    >
                        {getAIEditsMutation.isPending ? <Spinner size="sm" /> : "Edit with AI"}
                    </Button>
                </div>
            </div>
            <p className="text-gray-600 -mt-3">Review cards, view history, and manage this deck.</p>
            <hr className="border-gray-300" />

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow space-y-4">
                <h2 className="text-xl font-semibold text-gray-800">Play Options</h2>
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Strategy:</label>
                    <div className="flex flex-col sm:flex-row gap-y-2 gap-x-4">
                        <div className="flex items-center">
                            <input
                                type="radio"
                                id="strategy-all"
                                name="playStrategy"
                                value="all"
                                checked={playStrategy === 'all'}
                                onChange={() => setPlayStrategy('all')}
                                className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                            />
                            <label htmlFor="strategy-all" className="ml-2 block text-sm text-gray-900">Play All Cards</label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="radio"
                                id="strategy-missed"
                                name="playStrategy"
                                value="missedInTimeframe"
                                checked={playStrategy === 'missedInTimeframe'}
                                onChange={() => setPlayStrategy('missedInTimeframe')}
                                className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                            />
                            <label htmlFor="strategy-missed" className="ml-2 block text-sm text-gray-900">Play Missed Cards</label>
                        </div>
                    </div>
                </div>
                {playStrategy === 'missedInTimeframe' && (
                    <div className="space-y-1 pt-2">
                        <label htmlFor="timeframe-days" className="block text-sm font-medium text-gray-700">Within the last (days):</label>
                        <input
                            type="number"
                            id="timeframe-days"
                            value={timeframeDays}
                            onChange={(e) => setTimeframeDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            min="1"
                            className="mt-1 block w-full sm:w-1/3 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"
                        />
                    </div>
                )}
                <div className="flex items-center space-x-3 pt-3">
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
                <div className="pt-2">
                    <Button
                        onClick={handleStartPlaying}
                        variant="secondary"
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                    >
                        Play
                    </Button>
                </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Cards in Deck ({cards ? cards.length : 0})</h2>
                </div>

                {cardsLoading && (typeof cards === 'undefined' || cards.length === 0) && (
                    <div className="text-center text-gray-500 py-4">Loading cards...</div>
                )}
                {!cardsLoading && (typeof cards === 'undefined' || cards.length === 0) && (
                    <div className="text-center text-gray-500 py-4">No cards in this deck.</div>
                )}

                {cards && cards.length > 0 && (
                    <div className="overflow-x-auto border border-gray-200 rounded-md">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Front</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Back</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {cards.map((card) => (
                                    <tr key={card.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-pre-wrap text-sm text-gray-800">{card.front_text}</td>
                                        <td className="px-4 py-3 whitespace-pre-wrap text-sm text-gray-800">{card.back_text}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                                            <Button onClick={() => openEditCardModal(card)} variant="default" size="sm" className="!p-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 19.94a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125M12 12.75l6.75-6.75" /></svg>
                                            </Button>
                                            <Button onClick={() => handleDeleteCard(card.id)} variant="primary" size="sm" className="!p-1.5" disabled={deleteCardMutation.isPending && deleteCardMutation.variables?.cardId === card.id}>
                                                {(deleteCardMutation.isPending && deleteCardMutation.variables?.cardId === card.id) ? <Spinner size="sm" /> :
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-4 h-4">
                                                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M5 6V4.5C5 3.675 5.675 3 6.5 3h11C18.325 3 19 3.675 19 4.5V6M10 10.5v6M14 10.5v6M6 18h12a2 2 0 002-2V8H4v8a2 2 0 002 2z" />
                                                    </svg>}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

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

            <AIEditPromptModal
                isOpen={isAIPromptModalOpen}
                onClose={() => setIsAIPromptModalOpen(false)}
                onSubmitPrompt={handleAIPromptSubmit}
                isLoading={getAIEditsMutation.isPending}
                error={getAIEditsMutation.isError ? (getAIEditsMutation.error?.message || 'Failed to get suggestions') : null}
            />

            {isAIReviewListOpen && aiEditSuggestions.length > 0 && deckId && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-start p-4 z-50 overflow-y-auto">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl my-8 space-y-4">
                        <h2 className="text-xl font-semibold text-gray-800">Review AI Suggestions for "{deck?.name}"</h2>
                        <p className="text-sm text-gray-600">Original prompt: <span className="italic">"{currentAIPrompt}"</span></p>
                        <AIEditReviewList
                            suggestions={aiEditSuggestions}
                            onApplyEdits={handleApplySelectedAIEdits}
                            onCancel={() => {
                                setIsAIReviewListOpen(false);
                                setAiEditSuggestions([]);
                            }}
                            isApplying={applyAIEditsMutation.isPending}
                            applyError={applyAIEditsMutation.isError ? (applyAIEditsMutation.error?.message || 'Failed to apply edits') : null}
                        />
                    </div>
                </div>
            )}

            {editingCard && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center p-4 z-40">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">Edit Card</h2>
                        <div>
                            <label htmlFor="edit-card-front" className="block text-sm font-medium text-gray-700 mb-1">Front Text</label>
                            <textarea id="edit-card-front" value={editCardFront} onChange={(e) => setEditCardFront(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="edit-card-back" className="block text-sm font-medium text-gray-700 mb-1">Back Text</label>
                            <textarea id="edit-card-back" value={editCardBack} onChange={(e) => setEditCardBack(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                        <div className="flex justify-end space-x-2 pt-2">
                            <Button variant="default" onClick={() => { setEditingCard(null); setEditCardFront(''); setEditCardBack(''); }} disabled={updateCardMutation.isPending}>Cancel</Button>
                            <Button variant="primary" onClick={handleUpdateCard} disabled={updateCardMutation.isPending || !editCardFront.trim() || !editCardBack.trim()}>
                                {updateCardMutation.isPending ? <Spinner size="sm" /> : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}