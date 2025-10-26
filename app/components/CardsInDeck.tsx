'use client';

import React from 'react';
import type { Card } from '@/types';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';

interface CardsInDeckProps {
    cards: Card[] | undefined;
    isLoading: boolean;
    canManageCards: boolean;
    onCreateCard: (front: string, back: string) => Promise<void>;
    isCreatingCard: boolean;
    onEditCard: (card: Card) => void;
    onDeleteCard: (cardId: string) => void;
    deletingCardId?: string | null;
}

export default function CardsInDeck({
    cards,
    isLoading,
    canManageCards,
    onCreateCard,
    isCreatingCard,
    onEditCard,
    onDeleteCard,
    deletingCardId = null,
}: CardsInDeckProps) {
    const [isAddingRow, setIsAddingRow] = React.useState(false);
    const [newFront, setNewFront] = React.useState('');
    const [newBack, setNewBack] = React.useState('');
    const [validationError, setValidationError] = React.useState<string | null>(null);

    const resetRow = () => {
        setIsAddingRow(false);
        setNewFront('');
        setNewBack('');
        setValidationError(null);
    };

    const handleAddClick = () => {
        if (!canManageCards) return;
        setIsAddingRow(true);
        setValidationError(null);
    };

    const handleSave = async () => {
        const trimmedFront = newFront.trim();
        const trimmedBack = newBack.trim();

        if (!trimmedFront || !trimmedBack) {
            setValidationError('Front and back text cannot be empty.');
            return;
        }

        try {
            await onCreateCard(trimmedFront, trimmedBack);
            resetRow();
        } catch {
            // onCreateCard surfaces its own error feedback; keep row intact for retry.
        }
    };

    const renderTableBody = () => {
        if (isLoading) {
            return (
                <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                        <div className="flex items-center justify-center gap-3">
                            <Spinner size="sm" />
                            <span>Loading cards...</span>
                        </div>
                    </td>
                </tr>
            );
        }

        const rows: React.ReactNode[] = [];

        if (isAddingRow) {
            rows.push(
                <tr key="new-card" className="bg-blue-50/60">
                    <td className="px-4 py-3 align-top">
                        <textarea
                            value={newFront}
                            onChange={(e) => setNewFront(e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-blue-200 rounded-md shadow-sm focus:border-primary focus:ring-primary text-sm"
                            placeholder="Front text"
                            disabled={isCreatingCard}
                        />
                    </td>
                    <td className="px-4 py-3 align-top">
                        <textarea
                            value={newBack}
                            onChange={(e) => setNewBack(e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-blue-200 rounded-md shadow-sm focus:border-primary focus:ring-primary text-sm"
                            placeholder="Back text"
                            disabled={isCreatingCard}
                        />
                    </td>
                    <td className="px-4 py-3 align-top text-sm">
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleSave}
                                disabled={isCreatingCard}
                            >
                                {isCreatingCard ? <Spinner size="sm" /> : 'Save'}
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={resetRow}
                                disabled={isCreatingCard}
                            >
                                Cancel
                            </Button>
                        </div>
                        {validationError && (
                            <p className="text-xs text-red-600 mt-2">{validationError}</p>
                        )}
                    </td>
                </tr>
            );
        }

        if (!cards || cards.length === 0) {
            rows.push(
                <tr key="no-cards">
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                        {canManageCards
                            ? 'No cards yet. Add your first card to get started.'
                            : 'No cards in this deck.'}
                    </td>
                </tr>
            );
        } else {
            rows.push(
                ...cards.map((card) => (
                    <tr key={card.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-pre-wrap text-sm text-gray-800">{card.front_text}</td>
                        <td className="px-4 py-3 whitespace-pre-wrap text-sm text-gray-800">{card.back_text}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                            <Button onClick={() => onEditCard(card)} variant="default" size="sm" className="!p-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 19.94a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                </svg>
                            </Button>
                            <Button
                                onClick={() => onDeleteCard(card.id)}
                                variant="primary"
                                size="sm"
                                className="!p-1.5"
                                disabled={deletingCardId === card.id}
                            >
                                {deletingCardId === card.id ? (
                                    <Spinner size="sm" />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M5 6V4.5C5 3.675 5.675 3 6.5 3h11C18.325 3 19 3.675 19 4.5V6M10 10.5v6M14 10.5v6M6 18h12a2 2 0 002-2V8H4v8a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </Button>
                        </td>
                    </tr>
                ))
            );
        }

        return rows;
    };

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold text-gray-800">
                    Cards in Deck ({cards ? cards.length : 0})
                </h2>
                <Button
                    onClick={isAddingRow ? resetRow : handleAddClick}
                    variant={isAddingRow ? 'default' : 'primary'}
                    size="sm"
                    disabled={!canManageCards}
                    className="whitespace-nowrap"
                >
                    {isAddingRow ? 'Cancel Add' : 'Add Card'}
                </Button>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                Front
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                Back
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {renderTableBody()}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
