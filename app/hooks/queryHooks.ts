import { useMutation, useQueryClient, useQuery, type UseQueryOptions } from '@tanstack/react-query';
// Import shared types
import type { Card, Deck, ReviewHistoryEntry } from '@/types';
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
    getCardAction, // Import the new action
    getCardsForReviewAction, // Import the new action
    getMissedCardsForDeckInTimeframeAction // Added this import
} from '@/actions/cards';
// Import Server Actions for reviews
import { fetchDeckReviewHistoryAction } from '@/actions/reviews'; // Import the new action
import {
    getLastReviewEventPerCard,
    getLatestReviewForCardAction
} from '@/actions/reviewEvents'; // Import the new actions
import type { ReviewEvent } from '@/types'; // Import ReviewEvent type
// Import Quiz types and actions
import {
    generateQuizSetAction,
    scoreQuizAnswerAction
} from '@/actions/quiz';
import type { QuizSet, QuestionAnswerPair } from '@/types';
// Import AI Deck Edit Actions and types
import {
    getAIEditSuggestionsAction,
    applyAIEditsAction
} from '@/actions/aiEdits';
import type { AICardEditSuggestion } from '@/types';
import {
    generateAICardsForNewDeckAction,
    createDeckWithAICardsAction,
    type GeneratedCardData
} from '@/actions/aiDecks';
import { useAuth } from '@/context/useAuth'; // Added import for useAuth
// AI Chat actions
import {
    createAIChatSessionAction,
    listAIChatSessionsAction,
    getAIChatMessagesAction,
    sendAIChatMessageAction,
    getPendingToolCallsAction,
    approveToolCallAction
} from '@/actions/aiChat';
import type { AIChatMessage, AIChatSession } from '@/types';

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
        missedInTimeframe: (deckId: string, timeframeDays: number) => ['cards', deckId, 'missed', timeframeDays] as const, // Added new key
    },
    // Add other top-level keys (e.g., user) as needed
    reviews: {
        historyForDeck: (deckId: string) => ['reviews', deckId, 'history'] as const,
        latestForCard: (cardId: string) => ['reviews', 'latest', cardId] as const,
    },
    // Add key for review cards
    reviewSession: {
        all: ['reviewSession'] as const,
        byDeck: (deckId: string) => [...queryKeys.reviewSession.all, 'deck', deckId] as const,
        global: () => [...queryKeys.reviewSession.all, 'global'] as const,
    },
    // Add key for single card
    card: {
        detail: (cardId: string) => ['card', cardId] as const,
    }
};

export const reviewKeys = {
    all: ['reviews'] as const,
    deck: (deckId: string) => [...reviewKeys.all, 'deck', deckId] as const,
    card: (cardId: string) => [...reviewKeys.all, 'card', cardId] as const,
    lastPerCard: (deckId: string) => [...reviewKeys.all, 'lastPerCard', deckId] as const, // New key
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

// --- Deck Query Hooks ---

/**
 * Hook to fetch review history for a specific deck using Server Action.
 */
export const useDeckReviewHistory = (deckId: string | undefined) => {
    return useQuery<ReviewHistoryEntry[], Error>({
        queryKey: queryKeys.reviews.historyForDeck(deckId || 'unknown'),
        queryFn: async () => {
            if (!deckId) {
                return Promise.reject(new Error('Deck ID is required to fetch review history'));
            }
            const result = await fetchDeckReviewHistoryAction(deckId);
            if (!result.success || !result.history) {
                throw new Error(result.message || 'Failed to fetch review history');
            }
            return result.history;
        },
        enabled: !!deckId,
        staleTime: 1 * 60 * 1000, // Cache history for 1 minute
    });
};

/**
 * Hook to fetch the latest review event for a specific card.
 */
export const useLatestReviewForCard = (cardId: string | undefined) => {
    // Use shared ReviewEvent type after mapping
    return useQuery<ReviewEvent | null, Error>({
        queryKey: queryKeys.reviews.latestForCard(cardId || 'unknown'),
        queryFn: async () => {
            if (!cardId) {
                return null; // Or reject? Return null if no cardId means no fetch
            }
            // Action now returns the already mapped ReviewEvent | null
            const result = await getLatestReviewForCardAction(cardId);
            if (!result.success) {
                throw new Error(result.message || 'Failed to fetch latest review');
            }
            // result.reviewEvent is already ReviewEvent | null
            return result.reviewEvent ?? null;
        },
        enabled: !!cardId, // Only run if cardId is provided
        staleTime: 1 * 60 * 1000, // Cache for 1 minute
        gcTime: 5 * 60 * 1000,
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
            // Invalidate fetches for the deck the card belonged to
            queryClient.invalidateQueries({ queryKey: queryKeys.cards.forDeck(variables.deckId) });
            // Update the specific card query if it exists
            queryClient.setQueryData(queryKeys.card.detail(variables.cardId), data);
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

// Query to get the last review event result for each card in a deck
export const useLastReviewResults = (deckId: string | undefined, options?: Partial<UseQueryOptions<Map<string, { cardId: string; lastResult: ReviewResult; timestamp: Date; }>, Error>>) => {
    return useQuery({
        queryKey: reviewKeys.lastPerCard(deckId!), // Assert deckId is defined here, handled by enabled
        queryFn: () => getLastReviewEventPerCard(deckId!),
        enabled: !!deckId, // Only run the query if deckId is available
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        ...options,
    });
};

/**
 * Hook to fetch a single card by ID using Server Action.
 * Requires auth token.
 */
export const useCard = (cardId: string | undefined, token: string | undefined) => {
    return useQuery<Card, Error>({
        queryKey: queryKeys.card.detail(cardId || 'unknown'),
        queryFn: async () => {
            if (!cardId) {
                return Promise.reject(new Error('Card ID is required'));
            }
            const result = await getCardAction(cardId, token);
            if (!result.success || !result.card) {
                throw new Error(result.message || 'Failed to fetch card');
            }
            return result.card;
        },
        enabled: !!cardId && !!token,
        staleTime: 5 * 60 * 1000,
    });
};

/**
 * Hook to fetch cards for a review session (global or single deck) using Server Action.
 * Requires auth token.
 */
interface UseCardsForReviewOptions {
    deckId?: string; // Kept for existing single-deck review strategy if ever used directly by /play
    deckIds?: string[]; // New: for selecting multiple decks
    limit: number;
    strategy: 'random' | 'missedFirst';
    token: string | undefined;
    enabled?: boolean;
}

export const useCardsForReview = ({
    deckId,      // For specific deck (legacy or direct single deck play)
    deckIds,     // For multi-deck selection
    limit,
    strategy,
    token,
    enabled = true,
}: UseCardsForReviewOptions) => {
    const queryKeyParams: Record<string, any> = { limit, strategy };
    if (deckIds && deckIds.length > 0) {
        queryKeyParams.deckIds = deckIds.slice().sort().join(','); // Sort for consistent key
    } else if (deckId) {
        queryKeyParams.deckId = deckId;
    }
    // Base query key part
    const baseQueryKey = queryKeys.reviewSession.global(); // Using global as a base
    const queryKey = [...baseQueryKey, queryKeyParams];

    return useQuery<Card[], Error>({
        queryKey,
        queryFn: async () => {
            if (!token) {
                return Promise.reject(new Error('Authentication token is required'));
            }
            // Pass deckId OR deckIds to the action, not both usually.
            // Action will prioritize deckIds if present.
            const result = await getCardsForReviewAction({ token, deckId, deckIds, limit, strategy });
            if (!result.success || !result.cards) {
                throw new Error(result.message || 'Failed to fetch cards for review');
            }
            return result.cards;
        },
        enabled: !!token && enabled,
        staleTime: 0,
        refetchOnWindowFocus: false, // Preserve in-progress play sessions when browser tab focus changes
        gcTime: 5 * 60 * 1000,
    });
};

// --- Quiz Hooks ---

// Mutation hook for generating a new quiz set
export const useGenerateQuizMutation = () => {
    const queryClient = useQueryClient(); // Needed if we want to invalidate/cache quiz sets

    return useMutation<
        QuizSet, // Returns the generated QuizSet object
        Error,
        { topic: string } // Takes the topic string
    >({
        mutationFn: async ({ topic }) => {
            const result = await generateQuizSetAction(topic);
            if (!result.success || !result.quizSet) {
                throw new Error(result.message || 'Failed to generate quiz set.');
            }
            return result.quizSet;
        },
        // Optional: Invalidate or cache quiz data if needed
        // onSuccess: (data) => {
        //     // Maybe cache this quiz set?
        //     // queryClient.setQueryData(['quizSet', data.id], data);
        // },
        onError: (error) => {
            console.error("Generate Quiz Mutation Error:", error);
            // Error will be available on the mutation hook's state
        },
    });
};

// Type for the result of the scoring action
interface ScoreResult {
    is_correct: boolean;
    llm_rationale?: string;
}

// Type for the scoring mutation variables
interface ScoreQuizVariables {
    quizSetId: string;
    questionIndex: number;
    userAnswer: string;
}

// Mutation hook for scoring a single quiz answer
export const useScoreQuizAnswerMutation = () => {
    // const queryClient = useQueryClient(); // Needed if invalidating attempts data

    return useMutation<
        ScoreResult,        // Returns the scoring result
        Error,
        ScoreQuizVariables  // Takes quizSetId, index, and answer
    >({
        mutationFn: async ({ quizSetId, questionIndex, userAnswer }) => {
            const result = await scoreQuizAnswerAction(quizSetId, questionIndex, userAnswer);
            if (!result.success || typeof result.is_correct === 'undefined') {
                throw new Error(result.message || 'Failed to score quiz answer.');
            }
            // Return only the core result data
            return { is_correct: result.is_correct, llm_rationale: result.llm_rationale };
        },
        onError: (error) => {
            console.error("Score Quiz Answer Mutation Error:", error);
        },
        // No specific onSuccess needed unless updating UI based on attempts cache
    });
};

// --- AI Deck Edit Hooks ---

// Type for the result of getAIEditSuggestionsAction (for hook)
interface AIEditSuggestionsData {
    suggestions: AICardEditSuggestion[];
}

// Type for applyAIEditsAction result (for hook)
interface ApplyAIEditsData {
    appliedCount: number;
    failedCount: number;
    failureDetails?: { edit: AICardEditSuggestion, message: string }[];
    message: string; // Overall message from the action
}

// Mutation hook for getting AI edit suggestions
export const useGetAIEditSuggestionsMutation = () => {
    return useMutation<
        // Update TData to match the full action result, not just AIEditSuggestionsData
        { success: boolean; suggestions?: AICardEditSuggestion[]; message?: string },
        Error,
        { deckId: string; userPrompt: string; token: string | undefined | null }
    >({
        mutationFn: async ({ deckId, userPrompt, token }) => {
            const result = await getAIEditSuggestionsAction(deckId, userPrompt, token ?? undefined);
            // Return the whole result from the action
            return result;
        },
        onError: (error) => {
            console.error("Get AI Edit Suggestions Mutation Error:", error);
        },
    });
};

// Mutation hook for applying AI edits
export const useApplyAIEditsMutation = () => {
    const queryClient = useQueryClient();

    return useMutation<
        ApplyAIEditsData, // Returns the summary of application
        Error,
        { deckId: string; edits: AICardEditSuggestion[]; token: string | undefined | null } // Takes deckId, edits array, token
    >({
        mutationFn: async ({ deckId, edits, token }) => {
            const result = await applyAIEditsAction(deckId, edits, token ?? undefined);
            // Action already returns success true/false and includes counts/messages
            if (!result.success && result.failedCount === edits.length && edits.length > 0) {
                // If all edits failed and there was at least one edit, it's an operational error
                // but the hook should still resolve with the details from the action.
                // The action itself forms the error message in this case.
            }
            if (!result.success && result.message === 'Unauthorized.') {
                // Propagate unauthorized specifically if needed, though global handler should also catch it
                throw new Error(result.message);
            }
            // The hook succeeds if the action was called, returning the action's result.
            // The `success` field within ApplyAIEditsData indicates if all edits were applied without issues.
            return {
                appliedCount: result.appliedCount,
                failedCount: result.failedCount,
                failureDetails: result.failureDetails,
                message: result.message || (result.success ? 'Edits applied.' : 'Some edits failed.')
            };
        },
        onSuccess: (data, variables) => {
            // Invalidate deck cards and deck details to reflect changes
            queryClient.invalidateQueries({ queryKey: queryKeys.cards.forDeck(variables.deckId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.decks.detail(variables.deckId) });
            // Optionally: show a toast or notification based on data.message
        },
        onError: (error) => {
            console.error("Apply AI Edits Mutation Error:", error);
            // This usually catches network errors or if the mutationFn itself throws an unhandled exception
        },
    });
};

export function useGenerateAICardsMutation() {
    const { token } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { userInstructions: string; numberOfCards: number }) =>
            generateAICardsForNewDeckAction(data.userInstructions, data.numberOfCards, token ?? undefined),
        onSuccess: (data) => {
            if (data.success) {
                // Optionally, could invalidate something or show a global success message
                // For now, page-specific handling is probably better
            } else {
                // Error handled by the component
            }
        },
        onError: (error) => {
            // Error handled by the component
            console.error("Error in useGenerateAICardsMutation:", error);
        },
    });
}

export function useCreateDeckWithAICardsMutation() {
    const { token } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { deckName: string; cardsData: GeneratedCardData[] }) =>
            createDeckWithAICardsAction(data.deckName, data.cardsData, token ?? undefined),
        onSuccess: (data) => {
            if (data.success && data.deck) {
                queryClient.invalidateQueries({ queryKey: ['decks'] });
                queryClient.invalidateQueries({ queryKey: ['deck', data.deck.id] });
                queryClient.invalidateQueries({ queryKey: ['deckCards', data.deck.id] });
                // Redirect will be handled by the component
            } else {
                // Error handled by the component
            }
        },
        onError: (error) => {
            // Error handled by the component
            console.error("Error in useCreateDeckWithAICardsMutation:", error);
        },
    });
}

// --- New Hook for Missed Cards ---
interface UseMissedCardsForDeckInTimeframeParams {
    deckId: string | undefined;
    timeframeDays: number | undefined;
    token: string | undefined;
    enabled?: boolean;
}

export const useMissedCardsForDeckInTimeframe = ({
    deckId,
    timeframeDays,
    token,
    enabled = true,
}: UseMissedCardsForDeckInTimeframeParams) => {
    return useQuery<Card[], Error>({
        queryKey: queryKeys.cards.missedInTimeframe(deckId || 'unknown', timeframeDays || 0),
        queryFn: async () => {
            if (!deckId || typeof timeframeDays !== 'number' || timeframeDays <= 0) {
                return Promise.reject(new Error('Deck ID and valid timeframe (days) are required'));
            }
            if (!token) {
                return Promise.reject(new Error('Authentication token is required'));
            }
            const result = await getMissedCardsForDeckInTimeframeAction({ token, deckId, timeframeDays });
            if (!result.success || !result.cards) {
                throw new Error(result.message || 'Failed to fetch missed cards');
            }
            return result.cards;
        },
        enabled: !!deckId && !!token && typeof timeframeDays === 'number' && timeframeDays > 0 && enabled,
        staleTime: 0, // Data is likely to change based on new reviews
        gcTime: 5 * 60 * 1000,
    });
};

// --- AI Chat Hooks ---

export const useCreateAIChatSessionMutation = () => {
    const { token } = useAuth();
    return useMutation<{ id: string }, Error, void>({
        mutationFn: async () => {
            const res = await createAIChatSessionAction(token ?? undefined);
            if (!res.success || !res.session) throw new Error(res.message || 'Failed to create session');
            return { id: res.session.id };
        }
    });
};

export const useAIChatSessions = () => {
    const { token } = useAuth();
    return useQuery<AIChatSession[], Error>({
        queryKey: ['aiChat', 'sessions'],
        queryFn: async () => {
            const res = await listAIChatSessionsAction(token ?? undefined);
            if (!res.success || !res.sessions) throw new Error(res.message || 'Failed to load sessions');
            return res.sessions;
        },
        enabled: !!token,
        staleTime: 0,
    });
};

export const useAIChatMessages = (sessionId: string | undefined) => {
    const { token } = useAuth();
    return useQuery<AIChatMessage[], Error>({
        queryKey: ['aiChat', 'messages', sessionId],
        queryFn: async () => {
            if (!sessionId) throw new Error('Session id required');
            const res = await getAIChatMessagesAction(sessionId, token ?? undefined);
            if (!res.success || !res.messages) throw new Error(res.message || 'Failed to load messages');
            return res.messages;
        },
        enabled: !!sessionId && !!token,
        staleTime: 0,
    });
};

export const useSendAIChatMessageMutation = (sessionId: string) => {
    const queryClient = useQueryClient();
    const { token } = useAuth();
    return useMutation<
        { assistantText?: string; pendingToolCalls?: { id: string; name: string; arguments: unknown }[] },
        Error,
        { text: string }
    >({
        mutationFn: async ({ text }) => {
            const res = await sendAIChatMessageAction(sessionId, text, token ?? undefined);
            if (!res.success) throw new Error(res.message || 'Failed to send');
            return { assistantText: res.assistantText, pendingToolCalls: res.pendingToolCalls };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['aiChat', 'messages', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['aiChat', 'pending', sessionId] });
        }
    });
};

export const usePendingToolCalls = (sessionId: string | undefined) => {
    const { token } = useAuth();
    return useQuery<{ id: string; name: string; arguments: unknown }[], Error>({
        queryKey: ['aiChat', 'pending', sessionId],
        queryFn: async () => {
            if (!sessionId) throw new Error('Session id required');
            const res = await getPendingToolCallsAction(sessionId, token ?? undefined);
            if (!res.success || !res.toolCalls) throw new Error(res.message || 'Failed to load pending tool calls');
            return res.toolCalls;
        },
        enabled: !!sessionId && !!token,
        staleTime: 0,
    });
};

export const useApproveToolCallMutation = (sessionId: string) => {
    const queryClient = useQueryClient();
    const { token } = useAuth();
    return useMutation<void, Error, { toolCallId: string; approve: boolean }>({
        mutationFn: async ({ toolCallId, approve }) => {
            const res = await approveToolCallAction(sessionId, toolCallId, approve, token ?? undefined);
            if (!res.success) throw new Error(res.message || 'Failed to approve tool');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['aiChat', 'messages', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['aiChat', 'pending', sessionId] });
        }
    });
};
