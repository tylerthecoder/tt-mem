'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    useDeck,
    useDeckReviewHistory,
    useDeckCards,
    useUpdateDeckMutation,
    useDeleteCardMutation,
    useCreateCardMutation,
} from '@/hooks/queryHooks';
import { type Card } from '@/types';
import { useAuth } from '@/context/useAuth';
import Spinner from '@/components/Spinner';
import CardsInDeck from '@/components/CardsInDeck';
import PageHeader, { PageHeaderActionButton, PageHeaderActionLink } from '@/components/PageHeader';

function IconPlay() {
    return (
        <svg width="11" height="11" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true" className="shrink-0">
            <path d="M1 1.5L11 7L1 12.5V1.5Z" />
        </svg>
    );
}

function IconEdit() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
        </svg>
    );
}

export default function DeckOverviewPage() {
    const params = useParams();
    const router = useRouter();
    const deckId = typeof params?.deckId === 'string' ? params.deckId : undefined;
    const { token } = useAuth();

    const [isEditingDeckName, setIsEditingDeckName] = useState(false);
    const [newDeckName, setNewDeckName] = useState('');

    const { data: deck, isLoading: deckLoading, refetch: refetchDeckInfo } = useDeck(deckId);
    const { data: history } = useDeckReviewHistory(deckId);
    const { data: cards, isLoading: cardsLoading, refetch: refetchDeckCards } = useDeckCards(deckId);

    const updateDeckNameMutation = useUpdateDeckMutation();
    const deleteCardMutation = useDeleteCardMutation();
    const createCardMutation = useCreateCardMutation();

    useEffect(() => {
        if (deck) setNewDeckName(deck.name);
    }, [deck]);

    // Derive last 3 reviews per card from already-fetched deck history (sorted newest-first)
    const recentReviewsPerCard = useMemo(() => {
        if (!history) return new Map();
        const map = new Map<string, typeof history>();
        for (const entry of history) {
            if (!map.has(entry.cardId)) map.set(entry.cardId, []);
            const arr = map.get(entry.cardId)!;
            if (arr.length < 3) arr.push(entry);
        }
        return map;
    }, [history]);

    const handleUpdateDeckName = async () => {
        if (!deckId || !newDeckName.trim() || !token || newDeckName.trim() === deck?.name) {
            setIsEditingDeckName(false);
            if (deck) setNewDeckName(deck.name);
            return;
        }
        updateDeckNameMutation.mutate({ deckId, name: newDeckName.trim(), token }, {
            onSuccess: () => {
                setIsEditingDeckName(false);
                refetchDeckInfo();
            },
            onError: (error) => {
                alert(`Failed to update deck name: ${error.message}`);
                if (deck) setNewDeckName(deck.name);
            },
        });
    };

    const handleCreateCard = async (frontText: string, backText: string) => {
        if (!deckId || !token) throw new Error('Unauthorized');
        await createCardMutation.mutateAsync({ deckId, frontText, backText, token });
        await refetchDeckCards();
    };

    const handleDeleteCard = (cardIdToDelete: string) => {
        if (!deckId || !token) return;
        if (window.confirm('Delete this card permanently?')) {
            deleteCardMutation.mutate({ cardId: cardIdToDelete, deckId, token }, {
                onError: (error) => alert(`Failed to delete card: ${error.message}`),
            });
        }
    };

    if (deckId === undefined) {
        return <div className="text-center text-red-500">Invalid Deck ID</div>;
    }

    if (deckLoading && !deck) {
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
        <div className="space-y-5">
            <PageHeader
                title={!isEditingDeckName ? (
                    <span className="break-words">{deck.name}</span>
                ) : (
                    <input
                        type="text"
                        value={newDeckName}
                        onChange={(e) => setNewDeckName(e.target.value)}
                        className="w-full border-b border-primary bg-transparent px-0.5 text-sm font-medium text-gray-900 focus:outline-none"
                        autoFocus
                        onBlur={handleUpdateDeckName}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateDeckName();
                            if (e.key === 'Escape') { setIsEditingDeckName(false); setNewDeckName(deck.name); }
                        }}
                    />
                )}
                backHref="/decks"
                backLabel="Decks"
                actions={!isEditingDeckName ? (
                    <>
                        <PageHeaderActionButton
                            onClick={() => { setNewDeckName(deck.name); setIsEditingDeckName(true); }}
                            icon={<IconEdit />}
                        >
                            Edit
                        </PageHeaderActionButton>
                        <PageHeaderActionLink
                            href={`/deck/${deckId}/play?strategy=missedInTimeframe&timeframe=7`}
                            icon={<IconPlay />}
                        >
                            Missed
                        </PageHeaderActionLink>
                        <PageHeaderActionLink
                            href={`/deck/${deckId}/play`}
                            icon={<IconPlay />}
                        >
                            Play
                        </PageHeaderActionLink>
                    </>
                ) : (
                    <>
                        <PageHeaderActionButton
                            onClick={handleUpdateDeckName}
                            disabled={updateDeckNameMutation.isPending || newDeckName.trim() === deck.name || !newDeckName.trim()}
                            icon={<span aria-hidden="true">✓</span>}
                        >
                            {updateDeckNameMutation.isPending ? <Spinner size="sm" /> : 'Save'}
                        </PageHeaderActionButton>
                        <PageHeaderActionButton
                            onClick={() => { setIsEditingDeckName(false); setNewDeckName(deck.name); }}
                            disabled={updateDeckNameMutation.isPending}
                            icon={<span aria-hidden="true">×</span>}
                        >
                            Cancel
                        </PageHeaderActionButton>
                    </>
                )}
            />

            <CardsInDeck
                deckId={deckId}
                cards={cards}
                isLoading={cardsLoading && (!cards || (cards as Card[]).length === 0)}
                canManageCards={!!token}
                onCreateCard={handleCreateCard}
                isCreatingCard={createCardMutation.isPending}
                onDeleteCard={handleDeleteCard}
                deletingCardId={deleteCardMutation.isPending ? (deleteCardMutation.variables?.cardId ?? null) : null}
                recentReviewsPerCard={recentReviewsPerCard}
            />
        </div>
    );
}
