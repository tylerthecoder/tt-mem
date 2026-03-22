import { z } from 'zod';

export const richCardFields = {
    prompt_type: z.enum(['text', 'image', 'map']).optional(),
    prompt_text: z.string().nullable().optional(),
    answer_type: z.enum(['self_rate', 'type_in', 'multi', 'map_select']).optional(),
    correct_index: z.number().nullable().optional(),
    extra_context: z.string().nullable().optional(),
};

export const CardInputSchema = z.object({
    deckId: z.string().min(1),
    ...richCardFields,
    prompt_type: z.enum(['text', 'image', 'map']),
    prompt_content: z.string().min(1),
    answer_type: z.enum(['self_rate', 'type_in', 'multi', 'map_select']),
    answer_content: z.union([z.string().min(1), z.array(z.string()).min(2)]),
}).strict();

export const EditCardSchema = z.object({
    deckId: z.string().min(1),
    cardId: z.string().min(1),
    prompt_content: z.string().optional().nullable(),
    answer_content: z.union([z.string(), z.array(z.string())]).optional().nullable(),
    ...richCardFields,
}).strict();

export const MultiEditCardSchema = z.object({
    deckId: z.string().min(1),
    edits: z.array(z.object({
        cardId: z.string().min(1),
        prompt_content: z.string().optional().nullable(),
        answer_content: z.union([z.string(), z.array(z.string())]).optional().nullable(),
        ...richCardFields,
    }).strict()).min(1),
}).strict();

export const BulkAddCardsSchema = z.object({
    deckId: z.string().min(1),
    cards: z.array(z.object({
        ...richCardFields,
        prompt_type: z.enum(['text', 'image', 'map']),
        prompt_content: z.string().min(1),
        answer_type: z.enum(['self_rate', 'type_in', 'multi', 'map_select']),
        answer_content: z.union([z.string().min(1), z.array(z.string()).min(2)]),
    }).strict()).min(1),
}).strict();

export const RemoveCardSchema = z.object({
    deckId: z.string().min(1),
    cardId: z.string().min(1),
}).strict();

export const CreateDeckSchema = z.object({
    name: z.string().min(1),
    cards: z.array(z.object({
        ...richCardFields,
        prompt_type: z.enum(['text', 'image', 'map']),
        prompt_content: z.string().min(1),
        answer_type: z.enum(['self_rate', 'type_in', 'multi', 'map_select']),
        answer_content: z.union([z.string().min(1), z.array(z.string()).min(2)]),
    }).strict()),
}).strict();

export const ViewDeckSchema = z.object({
    deckId: z.string().min(1),
}).strict();
