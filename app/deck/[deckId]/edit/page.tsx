'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    useDeckCards,
    useDeck,
    useCreateCardMutation,
    useUpdateCardMutation,
    useDeleteCardMutation
} from '@/hooks/queryHooks';
import Button from '@/components/Button';
import { useAuth } from '@/context/useAuth';
import type { Card } from '@/types';

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

    // Use the real hook for deck details
    const { data: deck, isLoading: deckLoading, error: deckError } = useDeck(deckId);

    // Fetch cards (currently mock)
    const { data: cards, isLoading: cardsLoading, error: cardsError } = useDeckCards(deckId);

    // Get mutation functions
    const createCardMutation = useCreateCardMutation();
    const updateCardMutation = useUpdateCardMutation();
    const deleteCardMutation = useDeleteCardMutation();

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

    // Loading/Error states
    if (deckId === undefined) {
        return <div className="text-center text-red-500">Invalid Deck ID</div>;
    }
    const isLoading = deckLoading || cardsLoading;
    const mutationLoading = createCardMutation.isPending || updateCardMutation.isPending || deleteCardMutation.isPending;
    const error = deckError || cardsError || createCardMutation.error || updateCardMutation.error || deleteCardMutation.error;

    if (isLoading && (!deck || !cards)) return <div className="text-center text-gray-500 py-10">Loading deck details...</div>;
    if (error) return <div className="text-center text-red-500 p-4 bg-red-50 rounded border border-red-200">Error: {error.message || 'Unknown error'}</div>;

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
                <Button onClick={openAddModal} variant="primary" disabled={mutationLoading}>
                    Add New Card
                </Button>
            ) : (
                <p className="text-center text-gray-500">Please login to manage cards.</p>
            )}

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
        </div>
    );
}