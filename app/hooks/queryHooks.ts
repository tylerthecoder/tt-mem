import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
// Remove mock imports
// import { fetchMockDeckCards, fetchMockDecks, mockLogin } from '../data/mock';
// import { Card, Deck } from '../types'; // Removed problematic import
// import { fetchDecks, fetchDeckById } from '@/api/client'; // Use path alias
// Import Server Actions for mutations
import {
    fetchDecksAction,
    fetchDeckByIdAction,
    createDeckAction,
    updateDeckAction,
    deleteDeckAction,
} from '@/actions/decks';
// Remove unused client functions
// import {
//     createDeck,
//     updateDeck,
//     deleteDeck,
// } from '@/api/client';

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
 * Hook to fetch all decks using Server Action.
 */
export const useDecks = () => {
    return useQuery<Deck[], Error>({
        queryKey: queryKeys.decks.all,
        queryFn: async () => {
            const result = await fetchDecksAction();
            if (!result.success || !result.decks) {
                throw new Error(result.message || 'Failed to fetch decks');
            }
            return result.decks;
        },
        staleTime: 5 * 60 * 1000,
    });
};

/**
 * Hook to fetch a single deck by ID using Server Action.
 */
export const useDeck = (deckId: string | undefined) => {
    return useQuery<Deck, Error>({
        queryKey: queryKeys.decks.detail(deckId || 'unknown'),
        queryFn: async () => {
            if (!deckId) {
                return Promise.reject(new Error('Deck ID is required'));
            }
            const result = await fetchDeckByIdAction(deckId);
            if (!result.success || !result.deck) {
                throw new Error(result.message || 'Failed to fetch deck');
            }
            return result.deck;
        },
        enabled: !!deckId,
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

// --- Deck Mutation Hooks using Server Actions ---

/**
 * Hook for creating a new deck.
 * Requires auth token to be passed when calling mutate.
 */
export const useCreateDeckMutation = () => {
    const queryClient = useQueryClient();
    // Type arguments: TData, TError, TVariables (name, token)
    return useMutation<
        Deck, // Expected success data type from action (result.deck)
        Error, // Error type
        { name: string; token: string | undefined | null } // Variables passed to mutationFn
    >({
        mutationFn: async ({ name, token }) => {
            const result = await createDeckAction(name, token ?? undefined);
            if (!result.success || !result.deck) {
                throw new Error(result.message || 'Failed to create deck');
            }
            return result.deck;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
        },
    });
};

/**
 * Hook for updating an existing deck.
 * Requires auth token to be passed when calling mutate.
 */
export const useUpdateDeckMutation = () => {
    const queryClient = useQueryClient();
    return useMutation<
        Deck,
        Error,
        { deckId: string; name: string; token: string | undefined | null }
    >({
        mutationFn: async ({ deckId, name, token }) => {
            const result = await updateDeckAction(deckId, name, token ?? undefined);
            if (!result.success || !result.deck) {
                throw new Error(result.message || 'Failed to update deck');
            }
            return result.deck;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.detail(variables.deckId) });
            // Update cache directly
            queryClient.setQueryData(queryKeys.decks.detail(variables.deckId), data);
        },
    });
};

/**
 * Hook for deleting a deck.
 * Requires auth token to be passed when calling mutate.
 */
export const useDeleteDeckMutation = () => {
    const queryClient = useQueryClient();
    return useMutation<
        void, // No data returned on success
        Error,
        { deckId: string; token: string | undefined | null }
    >({
        mutationFn: async ({ deckId, token }) => {
            const result = await deleteDeckAction(deckId, token ?? undefined);
            if (!result.success) {
                throw new Error(result.message || 'Failed to delete deck');
            }
            // No return value needed for void
        },
        onSuccess: (_, variables) => { // variables contains deckId and token
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
            // Remove detail query from cache
            queryClient.removeQueries({ queryKey: queryKeys.decks.detail(variables.deckId) });
        },
    });
};

// Remove old mock login mutation
// export const useLoginMutation = () => { ... };

// Remove old mock deck mutation
// export const useDeckMutation = () => { ... };

// TODO: Add mutation hooks for card CRUD operations (add, edit, delete)
// TODO: Add hook for creating review events

