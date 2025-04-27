import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
// Import shared types
import type { Card, Deck } from '@/types';
import { ReviewResult } from '@/types';
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
    importDeckAction,
} from '@/actions/decks';
// Import Server Actions for cards
import {
    fetchDeckCardsAction,
    createCardAction,
    updateCardAction,
    deleteCardAction,
    createReviewEventAction, // Import the action
} from '@/actions/cards';
// Remove unused client functions
// import {
//     createDeck,
//     updateDeck,
//     deleteDeck,
// } from '@/api/client';

// Query key factory for decks
const queryKeys = {
    decks: {
        all: ['decks'] as const,
        detail: (deckId: string) => [...queryKeys.decks.all, deckId] as const,
        cards: (deckId: string) => [...queryKeys.decks.detail(deckId), 'cards'] as const,
    },
    // Add cards query key
    cards: {
        forDeck: (deckId: string) => ['cards', deckId] as const,
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
 * Hook to fetch cards for a specific deck using Server Action.
 */
export const useDeckCards = (deckId: string | undefined) => {
    return useQuery<Card[], Error>({
        queryKey: queryKeys.cards.forDeck(deckId || 'unknown'),
        queryFn: async () => {
            if (!deckId) {
                return Promise.reject(new Error('Deck ID is required to fetch cards'));
            }
            const result = await fetchDeckCardsAction(deckId);
            if (!result.success || !result.cards) {
                throw new Error(result.message || 'Failed to fetch cards');
            }
            return result.cards;
        },
        enabled: !!deckId,
        staleTime: 5 * 60 * 1000,
    });
};

// --- Deck Mutation Hooks using Server Actions ---

/**
 * Hook for creating a new deck.
 * Requires auth token to be passed when calling mutate.
 */
export const useCreateDeckMutation = () => {
    const queryClient = useQueryClient();
    // Use imported Deck type for TData
    return useMutation<
        Deck,
        Error,
        { name: string; token: string | undefined | null }
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
    // Use imported Deck type for TData
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
            // Use string ID for detail query key
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.detail(variables.deckId) });
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
        void,
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
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
            // Use string ID for removing detail query
            queryClient.removeQueries({ queryKey: queryKeys.decks.detail(variables.deckId) });
        },
    });
};

// Remove old mock login mutation
// export const useLoginMutation = () => { ... };

// Remove old mock deck mutation
// export const useDeckMutation = () => { ... };

// --- Card Mutation Hooks ---

/**
 * Hook for creating a new card.
 * Requires auth token.
 */
export const useCreateCardMutation = () => {
    const queryClient = useQueryClient();
    return useMutation<
        Card,
        Error,
        { deckId: string; frontText: string; backText: string; token: string | undefined | null }
    >({
        mutationFn: async ({ deckId, frontText, backText, token }) => {
            const result = await createCardAction({ deckId, frontText, backText, token: token ?? undefined });
            if (!result.success || !result.card) {
                throw new Error(result.message || 'Failed to create card');
            }
            return result.card;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.cards.forDeck(variables.deckId) });
        },
    });
};

/**
 * Hook for updating an existing card.
 * Requires auth token.
 */
export const useUpdateCardMutation = () => {
    const queryClient = useQueryClient();
    return useMutation<
        Card,
        Error,
        { cardId: string; deckId: string; frontText?: string; backText?: string; token: string | undefined | null }
    >({
        mutationFn: async ({ cardId, deckId, frontText, backText, token }) => {
            const result = await updateCardAction({ cardId, deckId, frontText, backText, token: token ?? undefined });
            if (!result.success || !result.card) {
                throw new Error(result.message || 'Failed to update card');
            }
            return result.card;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.cards.forDeck(variables.deckId) });
            queryClient.setQueryData(queryKeys.cards.forDeck(variables.deckId), (old: Card[] | undefined) =>
                old?.map(card => card.id === variables.cardId ? data : card) || []
            );
        },
    });
};

/**
 * Hook for deleting a card.
 * Requires auth token.
 */
export const useDeleteCardMutation = () => {
    const queryClient = useQueryClient();
    return useMutation<
        void,
        Error,
        { cardId: string; deckId: string; token: string | undefined | null }
    >({
        mutationFn: async ({ cardId, deckId, token }) => {
            const result = await deleteCardAction({ cardId, deckId, token: token ?? undefined });
            if (!result.success) {
                throw new Error(result.message || 'Failed to delete card');
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.cards.forDeck(variables.deckId) });
            queryClient.setQueryData(queryKeys.cards.forDeck(variables.deckId), (old: Card[] | undefined) =>
                old?.filter(card => card.id !== variables.cardId) || []
            );
        },
    });
};

// --- Review Event Mutation Hooks ---

/**
 * Hook for creating a review event.
 * Does not require auth token currently (as per action).
 */
export const useCreateReviewEventMutation = () => {
    // No queryClient needed if not invalidating/updating cache
    // const queryClient = useQueryClient();
    return useMutation<
        string, // Returns the reviewEventId string
        Error,
        { cardId: string; deckId: string; result: ReviewResult }
    >({
        mutationFn: async ({ cardId, deckId, result }) => {
            const actionResult = await createReviewEventAction({ cardId, deckId, result });
            if (!actionResult.success || !actionResult.reviewEventId) {
                throw new Error(actionResult.message || 'Failed to record review event');
            }
            return actionResult.reviewEventId;
        },
        onSuccess: (reviewEventId, variables) => {
            console.log(`Review event ${reviewEventId} created for card ${variables.cardId} in deck ${variables.deckId} with result ${variables.result}`);
            // No cache invalidation needed here unless review history is displayed
        },
        onError: (error, variables) => {
            console.error(`Error recording review for card ${variables.cardId}:`, error);
            // Optionally show user feedback
        }
    });
};

// Type used for the mutation variables - should match the action input type
// This mirrors the structure expected by importDeckAction
interface ImportDeckMutationVariables {
    deckName: string;
    cardsData: { front: string; back: string }[]; // Expect an array of simple objects
    token: string | undefined | null;
}

/**
 * Hook for importing a new deck from JSON data.
 * Requires auth token.
 */
export const useImportDeckMutation = () => {
    const queryClient = useQueryClient();
    return useMutation<
        Deck,
        Error,
        ImportDeckMutationVariables, // Use the defined variable type
        unknown
    >({
        mutationFn: async ({ deckName, cardsData, token }) => {
            // The action expects cardsData: { front: string; back: string }[]
            const result = await importDeckAction(deckName, cardsData, token ?? undefined);
            if (!result.success || !result.deck) {
                const errorDetails = result.errorDetails ? `\nDetails: ${result.errorDetails.join('\n')}` : '';
                throw new Error(`${result.message || 'Failed to import deck.'}${errorDetails}`);
            }
            return result.deck;
        },
        onSuccess: () => {
            // Invalidate all deck queries to refresh the list
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
        },
        onError: (error) => {
            // Error is already thrown with details from mutationFn if possible
            console.error("Import Deck Mutation Error:", error);
            // UI should catch and display this error
        },
    });
};

