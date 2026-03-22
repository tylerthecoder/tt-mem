import { z } from 'zod';

/**
 * Compile-time constraint: rejects any field where `undefined` is a valid
 * output (i.e. the field uses `.optional()`). OpenAI strict mode requires
 * every property in `required`; use `.nullable()` for optional semantics.
 */
type StrictToolShape<T extends Record<string, z.ZodType>> = {
    [K in keyof T]: undefined extends z.infer<T[K]> ? never : T[K]
};

/**
 * Creates a `z.object().strict()` schema safe for OpenAI tool parameters.
 *
 * Guards against `.optional()` at two levels:
 *  - **Compile time** – TypeScript rejects any field whose output includes `undefined`.
 *  - **Runtime** – throws immediately if an `.optional()` field sneaks through via `any`.
 *
 * Use `.nullable()` instead of `.optional()` for fields the model may leave empty.
 * For nested objects inside arrays, use `toolSchema()` for those too.
 */
export function toolSchema<T extends Record<string, z.ZodType>>(
    shape: T & StrictToolShape<T>,
) {
    for (const [key, field] of Object.entries(shape)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const def = (field as any)._zod?.def ?? (field as any)._def;
        if (def?.type === 'optional' || def?.typeName === 'ZodOptional') {
            throw new Error(
                `toolSchema: field "${key}" uses .optional(), which is incompatible ` +
                `with OpenAI strict mode. Use .nullable() instead.`,
            );
        }
    }
    return z.object(shape).strict();
}

export const richCardFields = {
    prompt_type: z.enum(['text', 'image', 'map']).nullable(),
    prompt_text: z.string().nullable(),
    answer_type: z.enum(['self_rate', 'type_in', 'multi', 'map_select']).nullable(),
    correct_index: z.number().nullable(),
    extra_context: z.string().nullable(),
};

export const CardInputSchema = toolSchema({
    deckId: z.string().min(1),
    ...richCardFields,
    prompt_type: z.enum(['text', 'image', 'map']),
    prompt_content: z.string().min(1),
    answer_type: z.enum(['self_rate', 'type_in', 'multi', 'map_select']),
    answer_content: z.union([z.string().min(1), z.array(z.string()).min(2)]),
});

export const EditCardSchema = toolSchema({
    deckId: z.string().min(1),
    cardId: z.string().min(1),
    prompt_content: z.string().nullable(),
    answer_content: z.union([z.string(), z.array(z.string())]).nullable(),
    ...richCardFields,
});

export const MultiEditCardSchema = toolSchema({
    deckId: z.string().min(1),
    edits: z.array(toolSchema({
        cardId: z.string().min(1),
        prompt_content: z.string().nullable(),
        answer_content: z.union([z.string(), z.array(z.string())]).nullable(),
        ...richCardFields,
    })).min(1),
});

export const BulkAddCardsSchema = toolSchema({
    deckId: z.string().min(1),
    cards: z.array(toolSchema({
        ...richCardFields,
        prompt_type: z.enum(['text', 'image', 'map']),
        prompt_content: z.string().min(1),
        answer_type: z.enum(['self_rate', 'type_in', 'multi', 'map_select']),
        answer_content: z.union([z.string().min(1), z.array(z.string()).min(2)]),
    })).min(1),
});

export const RemoveCardSchema = toolSchema({
    deckId: z.string().min(1),
    cardId: z.string().min(1),
});

export const CreateDeckSchema = toolSchema({
    name: z.string().min(1),
    cards: z.array(toolSchema({
        ...richCardFields,
        prompt_type: z.enum(['text', 'image', 'map']),
        prompt_content: z.string().min(1),
        answer_type: z.enum(['self_rate', 'type_in', 'multi', 'map_select']),
        answer_content: z.union([z.string().min(1), z.array(z.string()).min(2)]),
    })),
});

export const ViewDeckSchema = toolSchema({
    deckId: z.string().min(1),
});

export const ViewAllDecksSchema = toolSchema({});
