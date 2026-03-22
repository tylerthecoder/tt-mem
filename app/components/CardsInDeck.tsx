'use client';

import React from 'react';
import Link from 'next/link';
import type { Card, ReviewHistoryEntry, ReviewResult } from '@/types';
import Spinner from '@/components/Spinner';

interface CardsInDeckProps {
    deckId: string;
    cards: Card[] | undefined;
    isLoading: boolean;
    canManageCards: boolean;
    onCreateCard: (front: string, back: string) => Promise<void>;
    isCreatingCard: boolean;
    onDeleteCard: (cardId: string) => void;
    deletingCardId?: string | null;
    recentReviewsPerCard?: Map<string, ReviewHistoryEntry[]>;
}

const rowActionClass =
    'inline-flex items-center gap-1 rounded px-1.5 py-1 text-sm font-medium text-gray-400 transition-colors hover:bg-red-50 hover:text-primary';

function resultDotColor(entry: ReviewHistoryEntry): string {
    if (entry.is_correct === true) return 'bg-green-500';
    if (entry.is_correct === false) return 'bg-red-500';
    switch (entry.result as ReviewResult | undefined) {
        case 'easy': return 'bg-green-500';
        case 'medium': return 'bg-blue-500';
        case 'hard': return 'bg-orange-400';
        case 'missed': return 'bg-red-500';
        default: return 'bg-gray-300';
    }
}

function resultDotTitle(entry: ReviewHistoryEntry): string {
    if (entry.result) return entry.result;
    if (entry.is_correct === true) return 'correct';
    if (entry.is_correct === false) return 'incorrect';
    return 'reviewed';
}

function HistoryDots({ reviews }: { reviews: ReviewHistoryEntry[] }) {
    const dots = reviews.slice(0, 3);
    if (dots.length === 0) return <span className="text-xs text-gray-300">—</span>;
    return (
        <div className="flex items-center gap-1 shrink-0">
            {dots.map(r => (
                <span
                    key={r.eventId}
                    title={resultDotTitle(r)}
                    className={`inline-block w-2 h-2 rounded-full ${resultDotColor(r)}`}
                />
            ))}
        </div>
    );
}

function IconEdit() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
        </svg>
    );
}

function IconTrash() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
    );
}

function AddCardRow({
    isCreatingCard,
    onSave,
    onCancel,
}: {
    isCreatingCard: boolean;
    onSave: (front: string, back: string) => Promise<void>;
    onCancel: () => void;
}) {
    const [front, setFront] = React.useState('');
    const [back, setBack] = React.useState('');
    const [error, setError] = React.useState<string | null>(null);

    const inputClass = 'flex-1 min-w-0 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-primary';

    const handleSave = async () => {
        if (!front.trim() || !back.trim()) {
            setError('Both fields are required.');
            return;
        }
        setError(null);
        try {
            await onSave(front.trim(), back.trim());
        } catch {
            // parent surfaces the error
        }
    };

    return (
        <div className="flex flex-col gap-2 bg-gray-50 px-4 py-3 border-b border-gray-100">
            <div className="flex gap-2 items-center">
                <input
                    autoFocus
                    value={front}
                    onChange={e => setFront(e.target.value)}
                    placeholder="Front"
                    className={inputClass}
                    disabled={isCreatingCard}
                />
                <span className="text-gray-300 text-sm shrink-0">→</span>
                <input
                    value={back}
                    onChange={e => setBack(e.target.value)}
                    placeholder="Back"
                    className={inputClass}
                    disabled={isCreatingCard}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
                <button onClick={handleSave} disabled={isCreatingCard} className={`${rowActionClass} hover:text-green-600 hover:bg-green-50`}>
                    {isCreatingCard ? <Spinner size="sm" /> : 'Save'}
                </button>
                <button onClick={onCancel} disabled={isCreatingCard} className={rowActionClass}>
                    Cancel
                </button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}

export default function CardsInDeck({
    deckId,
    cards,
    isLoading,
    canManageCards,
    onCreateCard,
    isCreatingCard,
    onDeleteCard,
    deletingCardId = null,
    recentReviewsPerCard,
}: CardsInDeckProps) {
    const [isAddingRow, setIsAddingRow] = React.useState(false);

    const handleSave = async (front: string, back: string) => {
        await onCreateCard(front, back);
        setIsAddingRow(false);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Cards ({cards?.length ?? 0})
                </p>
                {canManageCards && !isAddingRow && (
                    <button onClick={() => setIsAddingRow(true)} className={rowActionClass}>
                        + Add
                    </button>
                )}
            </div>

            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                {isAddingRow && (
                    <AddCardRow
                        isCreatingCard={isCreatingCard}
                        onSave={handleSave}
                        onCancel={() => setIsAddingRow(false)}
                    />
                )}

                {isLoading && (
                    <div className="flex items-center gap-4 px-4 py-3 bg-white">
                        <Spinner size="sm" />
                        <span className="text-sm text-gray-400">Loading cards…</span>
                    </div>
                )}

                {!isLoading && (!cards || cards.length === 0) && !isAddingRow && (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                        No cards yet. {canManageCards && 'Add one above.'}
                    </div>
                )}

                {!isLoading && cards && cards.map((card) => {
                    const reviews = recentReviewsPerCard?.get(card.id) ?? [];
                    const isImage = card.prompt_type === 'image';

                    return (
                        <div
                            key={card.id}
                            className="flex items-center bg-white px-4 py-2 hover:bg-gray-50 transition-colors gap-3"
                        >
                            {/* Front */}
                            <Link
                                href={`/card/${card.id}`}
                                className="flex items-center gap-2 flex-1 min-w-0"
                            >
                                {isImage && card.prompt_content ? (
                                    <img
                                        src={card.prompt_content}
                                        alt={card.prompt_text || card.prompt_content || 'Card image'}
                                        className="w-10 h-10 object-cover rounded shrink-0 border border-gray-100"
                                    />
                                ) : (
                                    <span className="text-sm text-gray-800 truncate">{card.prompt_text || card.prompt_content}</span>
                                )}
                            </Link>

                            {/* Divider */}
                            <span className="text-gray-200 shrink-0">→</span>

                            {/* Back */}
                            <Link href={`/card/${card.id}`} className="flex-1 min-w-0">
                                <span className="text-sm text-gray-500 truncate block">
                                    {typeof card.answer_content === 'string'
                                        ? card.answer_content
                                        : (card.answer_content?.[card.correct_index ?? 0] ?? '')}
                                </span>
                            </Link>

                            {/* History dots */}
                            <HistoryDots reviews={reviews} />

                            {/* Actions */}
                            {canManageCards && (
                                <div className="flex items-center gap-0 shrink-0">
                                    <Link href={`/card/${card.id}/edit`} className={rowActionClass} title="Edit">
                                        <IconEdit />
                                    </Link>
                                    <button
                                        onClick={() => onDeleteCard(card.id)}
                                        disabled={deletingCardId === card.id}
                                        className={`${rowActionClass} hover:text-red-600 hover:bg-red-50`}
                                        title="Delete"
                                    >
                                        {deletingCardId === card.id ? <Spinner size="sm" /> : <IconTrash />}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
