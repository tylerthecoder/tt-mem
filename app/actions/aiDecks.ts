'use server';

import { z } from 'zod';
import { getOpenAIClient } from '@/lib/openai';
import { verifyAuthToken } from '@/lib/auth';
import type { QuestionAnswerPair } from '@/types';
import { createDeckAction } from './decks'; // Assuming this is the correct path
import { createCardAction } from './cards'; // Assuming this is the correct path
import type { Deck } from '@/types';

// --- Zod Schemas for Validation ---

const QuestionAnswerPairSchema = z.object({
    front_text: z.string().trim().min(1, 'Question text cannot be empty'),
    back_text: z.string().trim().min(1, 'Answer text cannot be empty'),
    extra_context: z.string().optional(),
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

Each flashcard object should represent a key term and its definition or a question with a clear, concise answer.
- The "front_text" should be the key term or question.
- The "back_text" should be its clear, concise definition or answer.
- Include an optional "extra_context" (string - a brief 1-2 sentence explanation or related information for the back_text).

Output Format:
Respond with a JSON object containing a single key "cards", which is an array of these flashcard objects.
Example: {"cards": [{"front_text": "Key Term 1", "back_text": "Definition of Key Term 1", "extra_context": "Additional context for Term 1..."}, ...]}

Focus on creating cards that are suitable for flashcard-style learning (term/definition, question/answer).`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
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
        // TODO: createCardAction does not currently support extra_context.
        // If AICreateCardSuggestion includes extra_context and we want to save it,
        // createCardAction needs to be updated to accept and store it.
        const cardResult = await createCardAction({
            deckId: newDeckId,
            frontText: card.front_text,
            backText: card.back_text,
            token
            // extra_context: card.extra_context, // Uncomment if createCardAction is updated
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
