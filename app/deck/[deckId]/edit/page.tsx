'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    useDeckCards,
    useDeck,
    useCreateCardMutation,
    useUpdateCardMutation,
    useDeleteCardMutation,
    useGetAIEditSuggestionsMutation,
    useApplyAIEditsMutation
} from '@/hooks/queryHooks';
import Button from '@/components/Button';
import { useAuth } from '@/context/useAuth';
import type { Card, AICardEditSuggestion } from '@/types';
import AIEditPromptModal from '@/components/AIEditPromptModal';
import AIEditReviewList from '@/components/AIEditReviewList';
import Spinner from '@/components/Spinner';

// --- Card Form Modal (Simple Example) ---
interface CardFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (front: string, back: string) => void;
    initialData?: { front: string; back: string };
    isLoading: boolean;
    title: string;
}

function CardFormModal({ isOpen, onClose, onSubmit, initialData, isLoading, title }: CardFormModalProps) {
    const [front, setFront] = useState(initialData?.front || '');
    const [back, setBack] = useState(initialData?.back || '');

    React.useEffect(() => {
        setFront(initialData?.front || '');
        setBack(initialData?.back || '');
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!front.trim() || !back.trim()) {
            alert('Both front and back text are required.');
            return;
        }
        onSubmit(front.trim(), back.trim());
    };

    const handleClose = () => {
        setFront('');
        setBack('');
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">{title}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="front-text" className="block text-sm font-medium text-gray-700">Front Text</label>
                        <textarea
                            id="front-text"
                            rows={3}
                            value={front}
                            onChange={(e) => setFront(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                        />
                    </div>
                    <div>
                        <label htmlFor="back-text" className="block text-sm font-medium text-gray-700">Back Text</label>
                        <textarea
                            id="back-text"
                            rows={3}
                            value={back}
                            onChange={(e) => setBack(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                        />
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="default" onClick={handleClose} disabled={isLoading}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={isLoading || !front.trim() || !back.trim()}>
                            {isLoading ? 'Saving...' : 'Save Card'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function EditDeckPage() {
    const params = useParams();
    const deckId = typeof params?.deckId === 'string' ? params.deckId : undefined;
    const { token } = useAuth();

    // State for modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<Card | null>(null);

    // --- AI Edit State ---
    const [isAIPromptModalOpen, setIsAIPromptModalOpen] = useState(false);
    const [aiSuggestions, setAISuggestions] = useState<AICardEditSuggestion[] | null>(null);
    const [aiSuggestionsError, setAISuggestionsError] = useState<string | null>(null);
    const [applyAIEditsSuccessMessage, setApplyAIEditsSuccessMessage] = useState<string | null>(null);
    // --- End AI Edit State ---

    // Use the real hook for deck details
    const { data: deck, isLoading: deckLoading, error: deckError } = useDeck(deckId);

    // Fetch cards (currently mock)
    const { data: cards, isLoading: cardsLoading, error: cardsError } = useDeckCards(deckId);

    // Get mutation functions
    const createCardMutation = useCreateCardMutation();
    const updateCardMutation = useUpdateCardMutation();
    const deleteCardMutation = useDeleteCardMutation();

    // --- AI Edit Mutations ---
    const getAISuggestionsMutation = useGetAIEditSuggestionsMutation();
    const applyAIEditsMutation = useApplyAIEditsMutation();
    // --- End AI Edit Mutations ---

    // Event Handlers using mutations
    const handleAddCardSubmit = (front: string, back: string) => {
        if (!deckId || !token) return;
        createCardMutation.mutate({ deckId, frontText: front, backText: back, token }, {
            onSuccess: () => {
                setIsAddModalOpen(false);
            },
            onError: (err) => {
                console.error("Failed to create card:", err);
                alert(`Error creating card: ${err.message}`);
            }
        });
    };

    const handleEditCardSubmit = (front: string, back: string) => {
        if (!editingCard || !deckId || !token) return;
        updateCardMutation.mutate({ cardId: editingCard.id, deckId, frontText: front, backText: back, token }, {
            onSuccess: () => {
                setIsEditModalOpen(false);
                setEditingCard(null);
            },
            onError: (err) => {
                console.error("Failed to update card:", err);
                alert(`Error updating card: ${err.message}`);
            }
        });
    };

    const handleDeleteCard = (cardId: string) => {
        if (!deckId || !token) return;
        if (window.confirm('Are you sure you want to delete this card?')) {
            deleteCardMutation.mutate({ cardId, deckId, token }, {
                onError: (err) => {
                    console.error("Failed to delete card:", err);
                    alert(`Error deleting card: ${err.message}`);
                }
            });
        }
    };

    // Functions to open modals
    const openAddModal = () => setIsAddModalOpen(true);
    const openEditModal = (card: Card) => {
        setEditingCard(card);
        setIsEditModalOpen(true);
    };

    // --- AI Edit Handlers ---
    const handleOpenAIPromptModal = () => {
        setAISuggestions(null);
        setAISuggestionsError(null);
        setApplyAIEditsSuccessMessage(null);
        setIsAIPromptModalOpen(true);
    };

    const handleSubmitAIPrompt = (prompt: string) => {
        if (!deckId || !token) return;
        setAISuggestionsError(null);
        setApplyAIEditsSuccessMessage(null);

        getAISuggestionsMutation.mutate({ deckId, userPrompt: prompt, token }, {
            onSuccess: (data) => {
                setAISuggestions(data.suggestions);
                setIsAIPromptModalOpen(false);
            },
            onError: (error) => {
                setAISuggestionsError(error.message);
            }
        });
    };

    const handleApplyAIEdits = (selectedEdits: AICardEditSuggestion[]) => {
        if (!deckId || !token) return;
        setApplyAIEditsSuccessMessage(null);

        applyAIEditsMutation.mutate({ deckId, edits: selectedEdits, token }, {
            onSuccess: (data) => {
                setApplyAIEditsSuccessMessage(data.message || 'Edits applied successfully!');
            },
            onError: (error) => {
            }
        });
    };

    const handleCancelAIReview = () => {
        setAISuggestions(null);
        setAISuggestionsError(null);
        setApplyAIEditsSuccessMessage(null);
        getAISuggestionsMutation.reset();
        applyAIEditsMutation.reset();
    };
    // --- End AI Edit Handlers ---

    // Loading/Error states
    if (deckId === undefined) {
        return <div className="text-center text-red-500">Invalid Deck ID</div>;
    }
    const isLoading = deckLoading || cardsLoading;
    const mutationLoading = createCardMutation.isPending || updateCardMutation.isPending || deleteCardMutation.isPending || getAISuggestionsMutation.isPending || applyAIEditsMutation.isPending;

    // Consolidate error checking for the main page error display
    let pageDisplayError: string | null = null;
    if (deckError) pageDisplayError = deckError.message;
    else if (cardsError) pageDisplayError = cardsError.message;
    // Mutations errors are handled by their respective components or inline
    // else if (createCardMutation.error) pageDisplayError = createCardMutation.error.message;
    // else if (updateCardMutation.error) pageDisplayError = updateCardMutation.error.message;
    // else if (deleteCardMutation.error) pageDisplayError = deleteCardMutation.error.message;
    // AI suggestion/apply errors are handled in their specific UI sections

    if (isLoading && (!deck || !cards)) return <div className="text-center text-gray-500 py-10">Loading deck details...</div>;
    // Use the consolidated pageDisplayError here
    if (pageDisplayError && !aiSuggestions) { // Only show general page error if not in AI review flow
        return <div className="text-center text-red-500 p-4 bg-red-50 rounded border border-red-200">Error: {pageDisplayError}</div>;
    }

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-primary break-words">Edit Deck: {deck?.name || deckId}</h1>
                <div className="flex space-x-2 self-end sm:self-center flex-shrink-0">
                    <Link href={`/deck/${deckId}/overview`} passHref legacyBehavior>
                        <Button as="a" variant="secondary">Back to Overview</Button>
                    </Link>
                    {/* TODO: Add Edit Deck Name Button/Modal */}
                </div>
            </div>
            <hr className="border-gray-300" />

            {token ? (
                <div className="flex flex-wrap gap-3">
                    <Button onClick={openAddModal} variant="primary" disabled={mutationLoading}>
                        Add New Card
                    </Button>
                    <Button onClick={handleOpenAIPromptModal} variant="secondary" disabled={getAISuggestionsMutation.isPending || applyAIEditsMutation.isPending}>
                        AI Edit Assistant
                    </Button>
                </div>
            ) : (
                <p className="text-center text-gray-500">Please login to manage cards.</p>
            )}

            {/* --- AI Edit Review List --- */}
            {aiSuggestions && (
                <div className="my-6 p-4 border border-dashed border-primary rounded-lg bg-primary/5">
                    <AIEditReviewList
                        suggestions={aiSuggestions}
                        onApplyEdits={handleApplyAIEdits}
                        onCancel={handleCancelAIReview}
                        isApplying={applyAIEditsMutation.isPending}
                        applyError={applyAIEditsMutation.error?.message || null}
                        applySuccessMessage={applyAIEditsSuccessMessage}
                    />
                </div>
            )}
            {/* --- End AI Edit Review List --- */}

            <h2 className="text-2xl font-semibold text-gray-900 pt-4">Cards in Deck</h2>
            {cardsLoading && <div className="text-center text-gray-500 py-6">Loading cards...</div>}
            {!cardsLoading && cards && cards.length > 0 ? (
                <ul className="space-y-4">
                    {cards.map(card => (
                        <li key={card.id} className="p-4 bg-white rounded-lg shadow space-y-3">
                            <div className="whitespace-pre-wrap"><strong className="font-medium text-gray-700">Front:</strong> {card.front_text}</div>
                            <div className="whitespace-pre-wrap"><strong className="font-medium text-gray-700">Back:</strong> {card.back_text}</div>
                            {token && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    <Button onClick={() => openEditModal(card)} variant="default" size="sm" disabled={mutationLoading}>Edit</Button>
                                    <Button
                                        onClick={() => handleDeleteCard(card.id)}
                                        variant="primary"
                                        size="sm"
                                        disabled={deleteCardMutation.isPending && deleteCardMutation.variables?.cardId === card.id}
                                        aria-label={`Delete card: ${card.front_text}`}
                                    >
                                        {(deleteCardMutation.isPending && deleteCardMutation.variables?.cardId === card.id) ? 'Deleting...' : 'Delete'}
                                    </Button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                !cardsLoading && <p className="text-center text-gray-500 py-6">No cards in this deck yet. {token ? 'Add one above!' : 'Login to add cards.'}</p>
            )}

            <CardFormModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleAddCardSubmit}
                isLoading={createCardMutation.isPending}
                title="Add New Card"
            />

            <CardFormModal
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); setEditingCard(null); }}
                onSubmit={handleEditCardSubmit}
                initialData={editingCard ? { front: editingCard.front_text, back: editingCard.back_text } : undefined}
                isLoading={updateCardMutation.isPending}
                title="Edit Card"
            />

            {/* --- AI Edit Prompt Modal --- */}
            <AIEditPromptModal
                isOpen={isAIPromptModalOpen}
                onClose={() => {
                    setIsAIPromptModalOpen(false);
                    getAISuggestionsMutation.reset();
                    setAISuggestionsError(null);
                }}
                onSubmitPrompt={handleSubmitAIPrompt}
                isLoading={getAISuggestionsMutation.isPending}
                error={aiSuggestionsError || (getAISuggestionsMutation.error instanceof Error ? getAISuggestionsMutation.error.message : null)}
            />
            {/* --- End AI Edit Prompt Modal --- */}
        </div>
    );
}