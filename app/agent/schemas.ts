import { z } from 'zod';

export const richCardFields = {
    answer_mode: z.enum(['flip', 'type_in', 'multiple_choice', 'map_select']).nullable().optional(),
    front_content_type: z.enum(['text', 'image', 'map_highlight']).nullable().optional(),
    front_image_url: z.string().nullable().optional(),
    front_map_country_code: z.string().nullable().optional(),
    correct_answer: z.string().nullable().optional(),
    choices: z.array(z.string()).nullable().optional(),
    correct_country_code: z.string().nullable().optional(),
    extra_context: z.string().nullable().optional(),
};

export const CardInputSchema = z.object({
    deckId: z.string().min(1),
    front_text: z.string().min(1),
    back_text: z.string().min(1),
    ...richCardFields,
});

export const EditCardSchema = z.object({
    deckId: z.string().min(1),
    cardId: z.string().min(1),
    front_text: z.string().optional().nullable(),
    back_text: z.string().optional().nullable(),
    ...richCardFields,
});

export const MultiEditCardSchema = z.object({
    deckId: z.string().min(1),
    edits: z.array(z.object({
        cardId: z.string().min(1),
        front_text: z.string().optional().nullable(),
        back_text: z.string().optional().nullable(),
        ...richCardFields,
    })).min(1),
});

export const BulkAddCardsSchema = z.object({
    deckId: z.string().min(1),
    cards: z.array(z.object({
        front_text: z.string().min(1),
        back_text: z.string().min(1),
        ...richCardFields,
    })).min(1),
});

export const RemoveCardSchema = z.object({
    deckId: z.string().min(1),
    cardId: z.string().min(1),
});

export const CreateDeckSchema = z.object({
    name: z.string().min(1),
    cards: z.array(z.object({
        front_text: z.string().min(1),
        back_text: z.string().min(1),
        ...richCardFields,
    })),
});

export const ViewDeckSchema = z.object({
    deckId: z.string().min(1),
});
