import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

/**
 * Initializes and returns a singleton OpenAI client instance.
 * Reads the API key from the OPENAI_API_KEY environment variable.
 * Throws an error if the API key is missing.
 */
export function getOpenAIClient(): OpenAI {
    if (openaiClient) {
        return openaiClient;
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error('Missing OPENAI_API_KEY environment variable.');
        throw new Error('OpenAI API key is not configured.');
    }

    openaiClient = new OpenAI({ apiKey });
    return openaiClient;
}