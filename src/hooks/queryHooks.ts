import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Remove mock imports
// import { fetchMockDeckCards, fetchMockDecks, mockLogin } from '../data/mock';
// import { Card, Deck } from '../types'; // Removed problematic import
import {
    fetchDecks,
    fetchDeckById,
    createDeck,
    updateDeck,
    deleteDeck,
    // loginUser - Login is handled by AuthContext now
} from '../api/client';

// Minimal inline types (adjust if needed)
interface Deck {
    id: string;
    name: string;
    created_at?: string;
    updated_at?: string;
}
interface Card {
    id: string;
    deck_id?: string; // Assuming relation
    front_text: string;
    back_text: string;
    created_at?: string;
    updated_at?: string;
}

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
 * Hook to fetch all decks using the API client.
 */
export const useDecks = () => {
    return useQuery<Deck[], Error>({
        queryKey: queryKeys.decks.all,
        queryFn: fetchDecks, // Use the real API call
        staleTime: 5 * 60 * 1000, // Cache data for 5 minutes
    });
};

/**
 * Hook to fetch a single deck by ID.
 */
export const useDeck = (deckId: string | undefined) => {
    return useQuery<Deck, Error>({
        queryKey: queryKeys.decks.detail(deckId || 'unknown'),
        queryFn: () => {
            if (!deckId) {
                // Immediately return rejected promise or handle appropriately
                return Promise.reject(new Error('Deck ID is required'));
            }
            return fetchDeckById(deckId); // Use real API call
        },
        enabled: !!deckId, // Only run query if deckId is available
        staleTime: 5 * 60 * 1000,
    });
};

/**
 * Hook to fetch cards for a specific deck.
 * Currently uses mock data - Needs Card API implementation
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useDeckCards = (deckId: string | undefined) => {
    // TODO: Replace with actual API call for fetching cards when available
    // return useQuery<Card[], Error>(...);
    console.warn("useDeckCards is using mock data");
    return {
        data: [] as Card[],
        isLoading: false,
        error: null
        // Mock structure to avoid breaking components
    };
};

// --- Deck Mutation Hooks ---

/**
 * Hook for creating a new deck.
 */
export const useCreateDeckMutation = () => {
    const queryClient = useQueryClient();
    return useMutation<Deck, Error, { name: string }>({
        mutationFn: ({ name }) => createDeck(name),
        onSuccess: () => {
            // Invalidate the decks list query to refetch updated data
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
        },
        // Optional: onError handling
    });
};

/**
 * Hook for updating an existing deck.
 */
export const useUpdateDeckMutation = () => {
    const queryClient = useQueryClient();
    return useMutation<Deck, Error, { deckId: string; name: string }>({
        mutationFn: ({ deckId, name }) => updateDeck(deckId, name),
        onSuccess: (data, variables) => {
            // Invalidate the decks list and the specific deck detail query
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.detail(variables.deckId) });
            // Optionally, update the cache directly with the returned data
            // queryClient.setQueryData(queryKeys.decks.detail(variables.deckId), data);
        },
    });
};

/**
 * Hook for deleting a deck.
 */
export const useDeleteDeckMutation = () => {
    const queryClient = useQueryClient();
    return useMutation<void, Error, { deckId: string }>({
        mutationFn: ({ deckId }) => deleteDeck(deckId),
        onSuccess: () => {
            // Invalidate the decks list query
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
            // Optionally remove the deck from the cache if needed
            // queryClient.removeQueries({ queryKey: queryKeys.decks.detail(variables.deckId) });
        },
    });
};

// Remove old mock login mutation
// export const useLoginMutation = () => { ... };

// Remove old mock deck mutation
// export const useDeckMutation = () => { ... };

// TODO: Add mutation hooks for card CRUD operations (add, edit, delete)
// TODO: Add hook for creating review events

