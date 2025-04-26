import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchMockDeckCards, fetchMockDecks, mockLogin } from '../data/mock';
import { Card, Deck } from '../../api/types'; // Update import path for types

// Query key factory for decks
const queryKeys = {
    decks: {
        all: ['decks'] as const,
        detail: (deckId: string) => [...queryKeys.decks.all, deckId] as const,
        cards: (deckId: string) => [...queryKeys.decks.detail(deckId), 'cards'] as const,
    },
    // Add other top-level keys (e.g., user) as needed
};

/**
 * Hook to fetch all decks.
 * Currently uses mock data.
 */
export const useDecks = () => {
    return useQuery<Deck[], Error>({
        queryKey: queryKeys.decks.all,
        queryFn: fetchMockDecks,
        staleTime: 5 * 60 * 1000, // Cache data for 5 minutes
    });
};

/**
 * Hook to fetch cards for a specific deck.
 * Currently uses mock data.
 */
export const useDeckCards = (deckId: string | undefined) => {
    return useQuery<Card[], Error>({
        queryKey: queryKeys.decks.cards(deckId || 'unknown'),
        queryFn: () => {
            if (!deckId) {
                // Return empty array immediately if deckId is missing
                return Promise.resolve([]);
            }
            return fetchMockDeckCards(deckId);
        },
        enabled: !!deckId,
        staleTime: 5 * 60 * 1000, // Cache data for 5 minutes
    });
};

// Mutation hooks

/**
 * Hook to handle the login mutation.
 * Calls the mockLogin function.
 */
export const useLoginMutation = () => {
    return useMutation<
        { success: boolean; token?: string; message?: string },
        Error,
        string
    >({
        mutationFn: mockLogin,
    });
};

// TODO: Add mutation hooks for card/deck CRUD operations (add, edit, delete)
// TODO: Add hook for creating review events

export const useDeck = (deckId: string | undefined) => {
    return useQuery<Deck, Error>({
        queryKey: queryKeys.decks.detail(deckId || 'unknown'),
        queryFn: () => fetchMockDeck(deckId),
    });
};

export const useDeckMutation = () => {
    return useMutation<Deck, Error, Deck>({
        mutationFn: (deck) => fetchMockDeck(deck.id, deck),
    });
};

