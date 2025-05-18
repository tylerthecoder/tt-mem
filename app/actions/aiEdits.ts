'use server';

import { z } from 'zod';
import { ObjectId } from 'mongodb'; // For cardId validation if needed
import { getOpenAIClient } from '@/lib/openai';
import { verifyAuthToken } from '@/lib/auth';
import { fetchDeckByIdAction } from './decks'; // To get deck name
import { fetchDeckCardsAction } from './cards'; // To get current cards
import type {
    AICreateCardSuggestion,
    AIUpdateCardSuggestion,
    AIDeleteCardSuggestion,
    AICardEditSuggestion,
    Card // For serializing current cards
} from '@/types';

// --- Zod Schemas for AI Edit Suggestions ---

const AICreateCardSchema = z.object({
    type: z.literal('create'),
    front_text: z.string().trim().min(1, "Front text cannot be empty for new card"),
    back_text: z.string().trim().min(1, "Back text cannot be empty for new card"),
    extra_context: z.string().optional(),
});

const AIUpdateCardSchema = z.object({
    type: z.literal('update'),
    cardId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid cardId format for update" }),
    front_text: z.string().trim().min(1).optional(),
    back_text: z.string().trim().min(1).optional(),
    extra_context: z.string().optional(),
});

const AIDeleteCardSchema = z.object({
    type: z.literal('delete'),
    cardId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid cardId format for delete" }),
});

const AIEditSuggestionSchema = z.discriminatedUnion("type", [
    AICreateCardSchema,
    AIUpdateCardSchema,
    AIDeleteCardSchema,
]);

const AIEditResponseSchema = z.object({
    edits: z.array(AIEditSuggestionSchema),
});


// --- Action: Get AI Edit Suggestions ---

interface GetAIEditSuggestionsResult {
    success: boolean;
    suggestions?: AICardEditSuggestion[];
    message?: string;
}

export async function getAIEditSuggestionsAction(
    deckId: string,
    userPrompt: string,
    token: string | undefined
): Promise<GetAIEditSuggestionsResult> {
    const authResult = verifyAuthToken(token);
    if (!authResult) {
        return { success: false, message: 'Unauthorized.' };
    }

    if (!deckId || !ObjectId.isValid(deckId)) {
        return { success: false, message: 'Invalid Deck ID.' };
    }
    if (!userPrompt || !userPrompt.trim()) {
        return { success: false, message: 'Prompt cannot be empty.' };
    }

    try {
        const openai = getOpenAIClient();

        // 1. Fetch current deck and cards
        const deckResult = await fetchDeckByIdAction(deckId); // Does not require token as per its definition
        if (!deckResult.success || !deckResult.deck) {
            return { success: false, message: deckResult.message || 'Failed to fetch deck details.' };
        }

        const cardsResult = await fetchDeckCardsAction(deckId);
        if (!cardsResult.success || !cardsResult.cards) {
            return { success: false, message: cardsResult.message || 'Failed to fetch deck cards.' };
        }

        // 2. Serialize deck state for the LLM
        const currentCardsSerialized = cardsResult.cards.map(card => ({
            id: card.id,
            front_text: card.front_text,
            back_text: card.back_text,
            // Do not include extra_context here unless we also want AI to edit it based on current value
        }));

        const systemPrompt = `You are an AI assistant helping to manage flashcard decks. Based on the user's request and the current state of the deck, provide a list of edits. The deck name is "${deckResult.deck.name}".

Current cards in the deck (only id, front_text, back_text are shown):
${JSON.stringify(currentCardsSerialized, null, 2)}

User's request: "${userPrompt}"

Instructions for your response:
- Respond with a JSON object containing a single key "edits", which is an array of edit objects.
- Each edit object must have a "type" field: "create", "update", or "delete".
- For "create": include "front_text" (string), "back_text" (string), and optionally "extra_context" (string).
- For "update": include "cardId" (string - ID of the card to change) and AT LEAST ONE of "front_text" (string), "back_text" (string), or "extra_context" (string).
- For "delete": include "cardId" (string - ID of the card to remove).
- If no edits are needed, return an empty "edits" array: {"edits": []}.
- Ensure card IDs for updates/deletes are from the provided current card list.
- If the user asks to add cards, provide 'create' operations.
- If the user asks to change existing cards, provide 'update' operations with the relevant cardId.
- If the user asks to remove cards, provide 'delete' operations with the relevant cardId.
- Be precise. Do not add conversational fluff. Only provide the JSON object.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o', // Or your preferred model
            messages: [{ role: 'system', content: systemPrompt }],
            response_format: { type: 'json_object' },
            temperature: 0.3, // Lower temperature for more predictable edits
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('OpenAI did not return content for edit suggestions.');
        }

        let parsedContent;
        try {
            parsedContent = JSON.parse(content);
        } catch (parseError) {
            console.error('Failed to parse OpenAI JSON response for edits:', parseError, 'Content:', content);
            throw new Error('Failed to parse edit suggestions from AI response.');
        }

        const validationResult = AIEditResponseSchema.safeParse(parsedContent);

        if (!validationResult.success) {
            console.error('OpenAI edit response validation (initial) failed:', validationResult.error.flatten());
            const errorMessages = validationResult.error.errors.map(err => `${err.path.join('.')} - ${err.message}`).join('; ');
            throw new Error(`Generated edit data is not in the expected format: ${errorMessages}`);
        }

        // Manually validate the refinement for update operations
        const validatedSuggestions: AICardEditSuggestion[] = [];
        for (const edit of validationResult.data.edits) {
            if (edit.type === 'update') {
                if (!edit.front_text && !edit.back_text && !edit.extra_context) {
                    throw new Error(`Update operation for cardId ${edit.cardId} must include at least one field to change (front_text, back_text, or extra_context).`);
                }
            }
            validatedSuggestions.push(edit as AICardEditSuggestion); // Cast after validation
        }

        return { success: true, suggestions: validatedSuggestions };

    } catch (error) {
        console.error('[Get AI Edit Suggestions Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to get AI edit suggestions.';
        return { success: false, message };
    }
}

// Placeholder for applyAIEditsAction - to be implemented next
interface ApplyAIEditsResult {
    success: boolean;
    appliedCount: number;
    failedCount: number;
    // Optionally, details about failures
    failureDetails?: { edit: AICardEditSuggestion, message: string }[];
    message?: string;
}

export async function applyAIEditsAction(
    deckId: string,
    edits: AICardEditSuggestion[],
    token: string | undefined
): Promise<ApplyAIEditsResult> {
    const authResult = verifyAuthToken(token);
    if (!authResult) {
        return { success: false, appliedCount: 0, failedCount: edits.length, message: 'Unauthorized.' };
    }

    if (!deckId || !ObjectId.isValid(deckId)) {
        return { success: false, appliedCount: 0, failedCount: edits.length, message: 'Invalid Deck ID.' };
    }

    let appliedCount = 0;
    const failureDetails: { edit: AICardEditSuggestion, message: string }[] = [];

    // Import card actions here to avoid circular dependency issues at module level if they also import from here
    const { createCardAction, updateCardAction, deleteCardAction } = await import('./cards');

    for (const edit of edits) {
        try {
            let result: { success: boolean; message?: string; card?: any };
            switch (edit.type) {
                case 'create':
                    result = await createCardAction({
                        deckId,
                        frontText: edit.front_text,
                        backText: edit.back_text,
                        // extra_context is not directly supported by createCardAction, handle if needed
                        // or update createCardAction to accept it.
                        // For now, it will be ignored for 'create' via this path.
                        token,
                    });
                    break;
                case 'update':
                    // Ensure at least one field is being updated (already validated by getAIEditSuggestionsAction)
                    result = await updateCardAction({
                        cardId: edit.cardId,
                        deckId, // updateCardAction needs deckId for revalidation context
                        frontText: edit.front_text,
                        backText: edit.back_text,
                        // extra_context is not directly supported by updateCardAction.
                        // If we want to update it, updateCardAction must be modified.
                        token,
                    });
                    break;
                case 'delete':
                    result = await deleteCardAction({
                        cardId: edit.cardId,
                        deckId, // deleteCardAction needs deckId
                        token,
                    });
                    break;
                default:
                    // Should not happen due to Zod validation
                    throw new Error('Invalid edit type encountered.');
            }

            if (result.success) {
                appliedCount++;
            } else {
                failureDetails.push({ edit, message: result.message || 'Unknown error during edit application.' });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown exception during edit application.';
            failureDetails.push({ edit, message });
        }
    }

    // Revalidate the deck edit page path after all edits
    if (appliedCount > 0 || failureDetails.length > 0) { // Revalidate if any change or attempted change
        const { revalidatePath } = await import('next/cache');
        revalidatePath(`/deck/${deckId}/edit`);
        revalidatePath(`/deck/${deckId}/overview`); // Also overview if card counts change
    }

    if (failureDetails.length > 0) {
        return {
            success: false, // Overall success is false if any edit failed
            appliedCount,
            failedCount: failureDetails.length,
            failureDetails,
            message: `${failureDetails.length} edit(s) failed to apply.`
        };
    }

    return {
        success: true,
        appliedCount,
        failedCount: 0,
        message: `${appliedCount} edit(s) applied successfully.`
    };
}