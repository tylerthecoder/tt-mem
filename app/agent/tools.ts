import { tool, webSearchTool } from '@openai/agents';
import { z } from 'zod';
import { createPendingToolCall } from '@/agent/store';
import { BulkAddCardsSchema, CardInputSchema, CreateDeckSchema, EditCardSchema, MultiEditCardSchema, ViewDeckSchema } from '@/agent/schemas';
import { fetchDeckByIdAction, fetchDecksAction } from '@/actions/decks';
import { fetchDeckCardsAction } from '@/actions/cards';

interface CreateAgentToolsOptions {
    sessionId: string;
    userMessageId: string;
    includeWebSearch: boolean;
}

export function createAgentTools({
    sessionId,
    userMessageId,
    includeWebSearch,
}: CreateAgentToolsOptions) {
    const addCardTool = tool({
        name: 'AddCard',
        description: 'Add a card to a deck. Supports rich card types: flip, type_in, multiple_choice, map_select.',
        parameters: CardInputSchema,
        execute: async (args: unknown) => {
            const pendingId = await createPendingToolCall(sessionId, userMessageId, 'AddCard', args);
            return { pendingApproval: true, toolCallId: pendingId };
        },
    });

    const editCardTool = tool({
        name: 'EditCard',
        description: 'Edit a card in a deck. Can update text, answer mode, choices, and other rich fields.',
        parameters: EditCardSchema,
        execute: async (args: unknown) => {
            const pendingId = await createPendingToolCall(sessionId, userMessageId, 'EditCard', args);
            return { pendingApproval: true, toolCallId: pendingId };
        },
    });

    const multiEditCardTool = tool({
        name: 'MultiEditCard',
        description: 'Apply multiple edits to cards within a deck. Each edit can update text and rich card fields.',
        parameters: MultiEditCardSchema,
        execute: async (args: unknown) => {
            const pendingId = await createPendingToolCall(sessionId, userMessageId, 'MultiEditCard', args);
            return { pendingApproval: true, toolCallId: pendingId };
        },
    });

    const bulkAddCardsTool = tool({
        name: 'BulkAddCards',
        description: 'Add multiple cards to an existing deck at once. Use this when adding more than 2 cards to a deck.',
        parameters: BulkAddCardsSchema,
        execute: async (args: unknown) => {
            const pendingId = await createPendingToolCall(sessionId, userMessageId, 'BulkAddCards', args);
            return { pendingApproval: true, toolCallId: pendingId };
        },
    });

    const removeCardTool = tool({
        name: 'RemoveCard',
        description: 'Remove a card from a deck.',
        parameters: z.object({
            deckId: z.string(),
            cardId: z.string(),
        }),
        execute: async (args: unknown) => {
            const pendingId = await createPendingToolCall(sessionId, userMessageId, 'RemoveCard', args);
            return { pendingApproval: true, toolCallId: pendingId };
        },
    });

    const createDeckTool = tool({
        name: 'CreateDeck',
        description: 'Create a new deck with a list of cards.',
        parameters: CreateDeckSchema,
        execute: async (args: unknown) => {
            const pendingId = await createPendingToolCall(sessionId, userMessageId, 'CreateDeck', args);
            return { pendingApproval: true, toolCallId: pendingId };
        },
    });

    const viewDeckTool = tool({
        name: 'ViewDeck',
        description: 'View a deck and its cards by deckId.',
        parameters: ViewDeckSchema,
        execute: async (args: unknown) => {
            const parsed = ViewDeckSchema.safeParse(args);
            if (!parsed.success) {
                return { success: false, message: parsed.error.message };
            }

            const deckRes = await fetchDeckByIdAction(parsed.data.deckId);
            const cardsRes = await fetchDeckCardsAction(parsed.data.deckId);
            return { deck: deckRes.deck, cards: cardsRes.cards };
        },
    });

    const viewAllDecksTool = tool({
        name: 'ViewAllDecks',
        description: 'List all decks with their ids and names.',
        parameters: z.object({}),
        execute: async () => {
            const res = await fetchDecksAction();
            return { decks: (res.decks || []).map((deck) => ({ id: deck.id, name: deck.name })) };
        },
    });

    return [
        ...(includeWebSearch ? [webSearchTool({ searchContextSize: 'medium' })] : []),
        createDeckTool,
        addCardTool,
        bulkAddCardsTool,
        editCardTool,
        multiEditCardTool,
        removeCardTool,
        viewDeckTool,
        viewAllDecksTool,
    ];
}
