'use server';

import { z } from 'zod';
import { getOpenAIClient } from '@/lib/openai';
import { verifyAuthToken } from '@/lib/auth';

const ScoreResponseSchema = z.object({
    is_correct: z.boolean(),
    rationale: z.string().optional(),
});

interface ScoreAnswerResult {
    success: boolean;
    is_correct?: boolean;
    rationale?: string;
    message?: string;
}

export async function scoreAnswerAction(
    userAnswer: string,
    correctAnswer: string,
    token?: string,
): Promise<ScoreAnswerResult> {
    const user = verifyAuthToken(token);
    if (!user) return { success: false, message: 'Unauthorized' };

    if (!userAnswer || !userAnswer.trim()) {
        return { success: false, message: 'Answer cannot be empty.' };
    }
    if (!correctAnswer || !correctAnswer.trim()) {
        return { success: false, message: 'Correct answer is missing.' };
    }

    try {
        const openai = getOpenAIClient();

        const prompt = `Evaluate if the user's answer is semantically correct compared to the reference answer for a flashcard.

Reference Answer: "${correctAnswer}"
User's Answer: "${userAnswer}"

Guidelines:
- The user's answer should be semantically correct compared to the reference answer.
- Spelling and grammar are not important, the meaning is what matters. (unless they spelled something completely different, i.e. "monet" is not correct for "manat")

Is the user's answer correct? Respond ONLY with a JSON object containing a boolean field "is_correct" and an optional string field "rationale" explaining your decision briefly.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-5.2-chat-latest',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.2,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('OpenAI scoring did not return content.');
        }

        const parsedContent = JSON.parse(content);
        const validationResult = ScoreResponseSchema.safeParse(parsedContent);
        if (!validationResult.success) {
            throw new Error('Scoring data is not in the expected format.');
        }

        return {
            success: true,
            is_correct: validationResult.data.is_correct,
            rationale: validationResult.data.rationale,
        };
    } catch (error) {
        console.error('[Score Answer Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to score answer.';
        return { success: false, message };
    }
}
