'use server';

import { z } from 'zod';
import { getOpenAIClient } from '@/lib/openai';
import { verifyAuthToken } from '@/lib/auth';
import type { QuestionAnswerPair } from '@/types';
import { AnswerMode, FrontContentType } from '@/types';
import { createDeckAction } from './decks';
import { createCardAction } from './cards';
import type { Deck } from '@/types';

// --- Zod Schemas for Validation ---

const QuestionAnswerPairSchema = z.object({
    front_text: z.string().trim().min(1, 'Question text cannot be empty'),
    back_text: z.string().trim().min(1, 'Answer text cannot be empty'),
    extra_context: z.string().optional(),
    front_content_type: z.enum(['text', 'image', 'map_highlight']).optional(),
    front_image_url: z.string().url().optional(),
    front_map_country_code: z.string().max(2).optional(),
    answer_mode: z.enum(['flip', 'type_in', 'multiple_choice', 'map_select']).optional(),
    correct_answer: z.string().optional(),
    choices: z.array(z.string()).optional(),
    correct_country_code: z.string().max(2).optional(),
});

// Dynamic schema for the response based on numberOfCards
const createAICardsResponseSchema = (numberOfCards: number) => z.object({
    cards: z.array(QuestionAnswerPairSchema).length(numberOfCards, `Must generate exactly ${numberOfCards} cards`),
});


// --- Action: Generate AI Cards for a New Deck ---

export interface GeneratedCardData {
    front_text: string;
    back_text: string;
    extra_context?: string;
    front_content_type?: string;
    front_image_url?: string;
    front_map_country_code?: string;
    answer_mode?: string;
    correct_answer?: string;
    choices?: string[];
    correct_country_code?: string;
}

interface GenerateAICardsResult {
    success: boolean;
    cards?: GeneratedCardData[];
    message?: string;
}

export async function generateAICardsForNewDeckAction(
    userInstructions: string,
    numberOfCards: number,
    token: string | undefined
): Promise<GenerateAICardsResult> {
    const authResult = verifyAuthToken(token);
    if (!authResult) {
        return { success: false, message: 'Unauthorized.' };
    }

    if (!userInstructions || !userInstructions.trim()) {
        return { success: false, message: 'User instructions cannot be empty.' };
    }
    if (numberOfCards <= 0 || numberOfCards > 50) {
        return { success: false, message: 'Number of cards must be between 1 and 50.' };
    }

    try {
        const openai = getOpenAIClient();

        const prompt = `Based on the following instructions, generate exactly ${numberOfCards} distinct flashcard objects:
"${userInstructions}"

Each flashcard object should represent a key term/question with its answer. You MUST choose the most appropriate answer_mode for each card:

Available answer modes:
- "flip" (default): Classic flashcard - user sees front, flips to see back. Best for definitions, concepts.
- "type_in": User types their answer, which is AI-scored. Set "correct_answer" to the expected answer. Best for vocabulary, factual recall.
- "multiple_choice": User picks from choices. Set "choices" (array of 4 strings) and "correct_answer". Best for recognition tasks.
- "map_select": User clicks a country on a map. Set "correct_country_code" (ISO alpha-2, e.g. "FR"). Best for geography.

Available front content types:
- "text" (default): Just text on the front.
- "map_highlight": Shows a map with a highlighted country. Set "front_map_country_code" (ISO alpha-2). Good for "identify this country" cards.

Required fields: "front_text", "back_text"
Optional fields: "extra_context", "answer_mode", "correct_answer", "choices", "correct_country_code", "front_content_type", "front_map_country_code"

Guidelines:
- Use a MIX of answer modes where appropriate for the topic.
- For geography topics, use "map_select" and "map_highlight" front content.
- For vocabulary/language topics, prefer "type_in" and "multiple_choice".
- For concept/definition topics, "flip" is fine.
- Always include "extra_context" with a brief 1-2 sentence explanation.
- For "multiple_choice", provide exactly 4 choices including the correct one.

Output Format:
{"cards": [{"front_text": "...", "back_text": "...", "answer_mode": "flip", "extra_context": "..."}, ...]}`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-5.2',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.6,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('OpenAI did not return content for card generation.');
        }

        let parsedContent;
        try {
            parsedContent = JSON.parse(content);
        } catch (parseError) {
            console.error('Failed to parse OpenAI JSON response for card generation:', parseError, 'Content:', content);
            throw new Error('Failed to parse card data from AI response.');
        }

        const validationSchema = createAICardsResponseSchema(numberOfCards);
        const validationResult = validationSchema.safeParse(parsedContent);

        if (!validationResult.success) {
            console.error('OpenAI card generation response validation failed:', validationResult.error.flatten());
            const errorMessages = validationResult.error.errors.map(err => `${err.path.join('.')} - ${err.message}`).join('; ');
            throw new Error(`Generated card data is not in the expected format: ${errorMessages}`);
        }

        return { success: true, cards: validationResult.data.cards };

    } catch (error) {
        console.error('[Generate AI Cards Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to generate cards for new deck.';
        return { success: false, message };
    }
}

// Placeholder for createDeckWithAICardsAction - to be implemented next

interface CreateDeckWithAICardsResult {
    success: boolean;
    deck?: Deck;
    createdCardsCount: number;
    failedCardsData?: GeneratedCardData[]; // Store data of cards that failed
    message?: string;
}

export async function createDeckWithAICardsAction(
    deckName: string,
    cardsData: GeneratedCardData[],
    token: string | undefined
): Promise<CreateDeckWithAICardsResult> {
    const authResult = verifyAuthToken(token);
    if (!authResult) {
        return { success: false, createdCardsCount: 0, message: 'Unauthorized.' };
    }

    if (!deckName || !deckName.trim()) {
        return { success: false, createdCardsCount: 0, message: 'Deck name cannot be empty.' };
    }
    if (!cardsData || cardsData.length === 0) {
        return { success: false, createdCardsCount: 0, message: 'No card data provided to create deck.' };
    }

    let createdCardsCount = 0;
    const failedCardsData: GeneratedCardData[] = [];

    // 1. Create the deck
    const deckResult = await createDeckAction(deckName.trim(), token);
    if (!deckResult.success || !deckResult.deck) {
        return {
            success: false,
            createdCardsCount: 0,
            message: deckResult.message || 'Failed to create the deck shell.',
            failedCardsData: cardsData // All cards failed as deck creation failed
        };
    }

    const newDeckId = deckResult.deck.id;

    // 2. Create cards for the new deck
    for (const card of cardsData) {
        const cardResult = await createCardAction({
            deckId: newDeckId,
            frontText: card.front_text,
            backText: card.back_text,
            token,
            extraContext: card.extra_context,
            frontContentType: card.front_content_type as FrontContentType | undefined,
            frontImageUrl: card.front_image_url,
            frontMapCountryCode: card.front_map_country_code,
            answerMode: card.answer_mode as AnswerMode | undefined,
            correctAnswer: card.correct_answer,
            choices: card.choices,
            correctCountryCode: card.correct_country_code,
        });

        if (cardResult.success) {
            createdCardsCount++;
        } else {
            console.warn(`Failed to create card "${card.front_text.substring(0, 20)}..." for new deck ${newDeckId}: ${cardResult.message}`);
            failedCardsData.push(card);
        }
    }

    if (failedCardsData.length > 0) {
        return {
            success: false, // Partial success, some cards failed
            deck: deckResult.deck,
            createdCardsCount,
            failedCardsData,
            message: `Deck "${deckResult.deck.name}" created, but ${failedCardsData.length} out of ${cardsData.length} cards failed to be added.`
        };
    }

    return {
        success: true,
        deck: deckResult.deck,
        createdCardsCount,
        message: `Deck "${deckResult.deck.name}" with ${createdCardsCount} cards created successfully!`
    };
}
