import { openai } from '@ai-sdk/openai';
import { tool } from 'ai';
import { executeApprovedToolCall } from '@/agent/approval';
import { BulkAddCardsSchema, CardInputSchema, CreateDeckSchema, EditCardSchema, MultiEditCardSchema, RemoveCardSchema, ViewAllDecksSchema, ViewDeckSchema } from '@/agent/schemas';
import { fetchDeckByIdAction, fetchDecksAction } from '@/actions/decks';
import { fetchDeckCardsAction } from '@/actions/cards';

interface CreateAgentToolsOptions {
    token: string | undefined;
}

export function createAgentTools({ token }: CreateAgentToolsOptions) {
    const addCardTool = tool({
        description: 'Add a card to a deck. Supports rich card types: flip, type_in, multiple_choice, map_select.',
        inputSchema: CardInputSchema,
        needsApproval: true,
        execute: async (args) => {
            return executeApprovedToolCall('AddCard', args, token);
        },
    });

    const editCardTool = tool({
        description: 'Edit a card in a deck. Can update text, answer mode, choices, and other rich fields.',
        inputSchema: EditCardSchema,
        needsApproval: true,
        execute: async (args) => {
            return executeApprovedToolCall('EditCard', args, token);
        },
    });

    const multiEditCardTool = tool({
        description: 'Apply multiple edits to cards within a deck. Each edit can update text and rich card fields.',
        inputSchema: MultiEditCardSchema,
        needsApproval: true,
        execute: async (args) => {
            return executeApprovedToolCall('MultiEditCard', args, token);
        },
    });

    const bulkAddCardsTool = tool({
        description: 'Add multiple cards to an existing deck at once. Use this when adding more than 2 cards to a deck.',
        inputSchema: BulkAddCardsSchema,
        needsApproval: true,
        execute: async (args) => {
            return executeApprovedToolCall('BulkAddCards', args, token);
        },
    });

    const removeCardTool = tool({
        description: 'Remove a card from a deck.',
        inputSchema: RemoveCardSchema,
        needsApproval: true,
        execute: async (args) => {
            return executeApprovedToolCall('RemoveCard', args, token);
        },
    });

    const createDeckTool = tool({
        description: 'Create a new deck with a list of cards.',
        inputSchema: CreateDeckSchema,
        needsApproval: true,
        execute: async (args) => {
            return executeApprovedToolCall('CreateDeck', args, token);
        },
    });

    const viewDeckTool = tool({
        description: 'View a deck and its cards by deckId.',
        inputSchema: ViewDeckSchema,
        execute: async ({ deckId }) => {
            const deckRes = await fetchDeckByIdAction(deckId);
            const cardsRes = await fetchDeckCardsAction(deckId);
            return { deck: deckRes.deck, cards: cardsRes.cards };
        },
    });

    const viewAllDecksTool = tool({
        description: 'List all decks with their ids and names.',
        inputSchema: ViewAllDecksSchema,
        execute: async () => {
            const res = await fetchDecksAction();
            return { decks: (res.decks || []).map((deck) => ({ id: deck.id, name: deck.name })) };
        },
    });

    return {
        web_search: openai.tools.webSearch({
            searchContextSize: 'medium',
        }),
        CreateDeck: createDeckTool,
        AddCard: addCardTool,
        BulkAddCards: bulkAddCardsTool,
        EditCard: editCardTool,
        MultiEditCard: multiEditCardTool,
        RemoveCard: removeCardTool,
        ViewDeck: viewDeckTool,
        ViewAllDecks: viewAllDecksTool,
    };
}
