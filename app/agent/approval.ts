import { AnswerMode, FrontContentType } from '@/types';
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
                    frontText: card.front_text,
                    backText: card.back_text,
                    token,
                    answerMode: undefinedIfNull(card.answer_mode as AnswerMode | null | undefined),
                    frontContentType: undefinedIfNull(card.front_content_type as FrontContentType | null | undefined),
                    frontImageUrl: undefinedIfNull(card.front_image_url),
                    frontMapCountryCode: undefinedIfNull(card.front_map_country_code),
                    correctAnswer: undefinedIfNull(card.correct_answer),
                    choices: undefinedIfNull(card.choices),
                    correctCountryCode: undefinedIfNull(card.correct_country_code),
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
                frontText: parsed.front_text,
                backText: parsed.back_text,
                token,
                answerMode: undefinedIfNull(parsed.answer_mode as AnswerMode | null | undefined),
                frontContentType: undefinedIfNull(parsed.front_content_type as FrontContentType | null | undefined),
                frontImageUrl: undefinedIfNull(parsed.front_image_url),
                frontMapCountryCode: undefinedIfNull(parsed.front_map_country_code),
                correctAnswer: undefinedIfNull(parsed.correct_answer),
                choices: undefinedIfNull(parsed.choices),
                correctCountryCode: undefinedIfNull(parsed.correct_country_code),
                extraContext: undefinedIfNull(parsed.extra_context),
            });
            return res.success ? res.card : res.message;
        }
        case 'EditCard': {
            const parsed = EditCardSchema.parse(args);
            const res = await updateCardAction({
                cardId: parsed.cardId,
                deckId: parsed.deckId,
                frontText: parsed.front_text ?? undefined,
                backText: parsed.back_text ?? undefined,
                token,
                answerMode: undefinedIfNull(parsed.answer_mode as AnswerMode | null | undefined),
                frontContentType: undefinedIfNull(parsed.front_content_type as FrontContentType | null | undefined),
                frontImageUrl: undefinedIfNull(parsed.front_image_url),
                frontMapCountryCode: undefinedIfNull(parsed.front_map_country_code),
                correctAnswer: undefinedIfNull(parsed.correct_answer),
                choices: undefinedIfNull(parsed.choices),
                correctCountryCode: undefinedIfNull(parsed.correct_country_code),
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
                    frontText: edit.front_text ?? undefined,
                    backText: edit.back_text ?? undefined,
                    token,
                    answerMode: undefinedIfNull(edit.answer_mode as AnswerMode | null | undefined),
                    frontContentType: undefinedIfNull(edit.front_content_type as FrontContentType | null | undefined),
                    frontImageUrl: undefinedIfNull(edit.front_image_url),
                    frontMapCountryCode: undefinedIfNull(edit.front_map_country_code),
                    correctAnswer: undefinedIfNull(edit.correct_answer),
                    choices: undefinedIfNull(edit.choices),
                    correctCountryCode: undefinedIfNull(edit.correct_country_code),
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
                    frontText: card.front_text,
                    backText: card.back_text,
                    token,
                    answerMode: undefinedIfNull(card.answer_mode as AnswerMode | null | undefined),
                    frontContentType: undefinedIfNull(card.front_content_type as FrontContentType | null | undefined),
                    frontImageUrl: undefinedIfNull(card.front_image_url),
                    frontMapCountryCode: undefinedIfNull(card.front_map_country_code),
                    correctAnswer: undefinedIfNull(card.correct_answer),
                    choices: undefinedIfNull(card.choices),
                    correctCountryCode: undefinedIfNull(card.correct_country_code),
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
