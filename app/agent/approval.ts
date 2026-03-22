import { BulkAddCardsSchema, CardInputSchema, CreateDeckSchema, EditCardSchema, MultiEditCardSchema, RemoveCardSchema } from '@/agent/schemas';
import { undefinedIfNull } from '@/agent/helpers';
import { createCardAction, deleteCardAction, updateCardAction } from '@/actions/cards';
import { createDeckAction } from '@/actions/decks';

export async function executeApprovedToolCall(name: string, args: unknown, token: string | undefined) {
    switch (name) {
        case 'CreateDeck': {
            const parsed = CreateDeckSchema.parse(args);
            const deckRes = await createDeckAction(parsed.name, token);
            if (!deckRes.success || !deckRes.deck) {
                throw new Error(deckRes.message || 'Failed to create deck');
            }

            const createdCards = [];
            for (const card of parsed.cards) {
                const cardRes = await createCardAction({
                    deckId: deckRes.deck.id,
                    token,
                    promptType: card.prompt_type,
                    promptContent: card.prompt_content,
                    promptText: undefinedIfNull(card.prompt_text),
                    answerType: card.answer_type,
                    answerContent: card.answer_content,
                    correctIndex: undefinedIfNull(card.correct_index),
                    extraContext: undefinedIfNull(card.extra_context),
                });
                if (cardRes.success && cardRes.card) {
                    createdCards.push(cardRes.card);
                }
            }

            return { deck: deckRes.deck, cardsCreated: createdCards.length };
        }
        case 'AddCard': {
            const parsed = CardInputSchema.parse(args);
            const res = await createCardAction({
                deckId: parsed.deckId,
                token,
                promptType: parsed.prompt_type,
                promptContent: parsed.prompt_content,
                promptText: undefinedIfNull(parsed.prompt_text),
                answerType: parsed.answer_type,
                answerContent: parsed.answer_content,
                correctIndex: undefinedIfNull(parsed.correct_index),
                extraContext: undefinedIfNull(parsed.extra_context),
            });
            return res.success ? res.card : res.message;
        }
        case 'EditCard': {
            const parsed = EditCardSchema.parse(args);
            const res = await updateCardAction({
                cardId: parsed.cardId,
                deckId: parsed.deckId,
                token,
                promptContent: parsed.prompt_content ?? undefined,
                answerContent: parsed.answer_content ?? undefined,
                promptType: undefinedIfNull(parsed.prompt_type),
                promptText: undefinedIfNull(parsed.prompt_text),
                answerType: undefinedIfNull(parsed.answer_type),
                correctIndex: undefinedIfNull(parsed.correct_index),
                extraContext: undefinedIfNull(parsed.extra_context),
            });
            return res.success ? res.card : res.message;
        }
        case 'MultiEditCard': {
            const parsed = MultiEditCardSchema.parse(args);
            const outcomes: { cardId: string; success: boolean; message?: string }[] = [];

            for (const edit of parsed.edits) {
                const res = await updateCardAction({
                    cardId: edit.cardId,
                    deckId: parsed.deckId,
                    token,
                    promptContent: edit.prompt_content ?? undefined,
                    answerContent: edit.answer_content ?? undefined,
                    promptType: undefinedIfNull(edit.prompt_type),
                    promptText: undefinedIfNull(edit.prompt_text),
                    answerType: undefinedIfNull(edit.answer_type),
                    correctIndex: undefinedIfNull(edit.correct_index),
                    extraContext: undefinedIfNull(edit.extra_context),
                });
                outcomes.push({ cardId: edit.cardId, success: Boolean(res.success), message: res.message });
            }

            return outcomes;
        }
        case 'BulkAddCards': {
            const parsed = BulkAddCardsSchema.parse(args);
            const createdCards = [];

            for (const card of parsed.cards) {
                const cardRes = await createCardAction({
                    deckId: parsed.deckId,
                    token,
                    promptType: card.prompt_type,
                    promptContent: card.prompt_content,
                    promptText: undefinedIfNull(card.prompt_text),
                    answerType: card.answer_type,
                    answerContent: card.answer_content,
                    correctIndex: undefinedIfNull(card.correct_index),
                    extraContext: undefinedIfNull(card.extra_context),
                });
                if (cardRes.success && cardRes.card) {
                    createdCards.push(cardRes.card);
                }
            }

            return { cardsAdded: createdCards.length };
        }
        case 'RemoveCard': {
            const parsed = RemoveCardSchema.parse(args);
            const res = await deleteCardAction({ cardId: parsed.cardId, deckId: parsed.deckId, token });
            return res.success ? 'Deleted' : res.message;
        }
        default:
            throw new Error('Unknown tool name for approval execution');
    }
}
