'use server';

import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db';
import { getOpenAIClient } from '@/lib/openai';
import { mapMongoId } from '@/lib/utils';
import type {
    QuizSetDocument,
    QuizSet,
    QuizAttemptDocument,
    QuestionAnswerPair,
} from '@/types';

// --- Zod Schemas for Validation ---

const QuestionAnswerPairSchema = z.object({
    question_text: z.string().trim().min(1, 'Question text cannot be empty'),
    answer_text: z.string().trim().min(1, 'Answer text cannot be empty'),
});

const QuizSetGenerationResponseSchema = z.object({
    quiz: z.array(QuestionAnswerPairSchema).length(10, 'Must generate exactly 10 questions'),
});

const ScoreResponseSchema = z.object({
    is_correct: z.boolean(),
    rationale: z.string().optional(),
});

// --- Helper: Map QuizSet Document ---
function mapQuizSetDocument(doc: QuizSetDocument): QuizSet {
    const mapped = mapMongoId(doc);
    // Assuming mapMongoId handles the _id to id conversion
    return mapped as QuizSet; // Add type assertion if needed
}

// --- Action: Generate Quiz Set ---

interface GenerateQuizResult {
    success: boolean;
    quizSet?: QuizSet;
    message?: string;
}

export async function generateQuizSetAction(topic: string): Promise<GenerateQuizResult> {
    if (!topic || !topic.trim()) {
        return { success: false, message: 'Topic cannot be empty.' };
    }

    try {
        const openai = getOpenAIClient();
        const { db } = await connectToDatabase();
        const quizSetsCollection = db.collection<QuizSetDocument>('quiz_sets');

        const prompt = `Generate exactly 10 distinct question and answer pairs about the topic: "${topic}".

Guidelines:
- The questions should be technical and precise.
- The answers should not be open-ended, they should be specific and concise.
- The questions should be suitable for a quiz format.


Output Format:
Provide the output as a JSON array of objects, where each object has keys "question_text" and "answer_text". Example format: {"quiz": [{"question_text": "Q1", "answer_text": "A1"}, ...]}
`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o', // Or your preferred generation model
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }, // Request JSON output
            temperature: 0.5, // Adjust creativity vs factualness
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('OpenAI did not return content.');
        }

        let parsedContent;
        try {
            // The response_format might wrap the array in a top-level key, adjust if needed
            // Assuming the direct content *is* the JSON array string
            parsedContent = JSON.parse(content);
            // If response_format wraps it, e.g., { "quiz": [...] }, use JSON.parse(content).quiz
        } catch (parseError) {
            console.error('Failed to parse OpenAI JSON response:', parseError, 'Content:', content);
            throw new Error('Failed to parse quiz data from AI response.');
        }

        console.log('Parsed Content:', parsedContent);

        const validationResult = QuizSetGenerationResponseSchema.safeParse(parsedContent);
        if (!validationResult.success) {
            console.error('OpenAI response validation failed:', validationResult.error.errors);
            throw new Error('Generated quiz data is not in the expected format.');
        }

        const newQuizSetData: Omit<QuizSetDocument, '_id'> = {
            topic: topic.trim(),
            questions: validationResult.data.quiz,
            createdAt: new Date(),
        };

        const insertResult = await quizSetsCollection.insertOne(newQuizSetData as QuizSetDocument);
        if (!insertResult.insertedId) {
            throw new Error('Failed to insert quiz set into database.');
        }

        // Fetch the inserted document to include the _id
        const createdDoc = await quizSetsCollection.findOne({ _id: insertResult.insertedId });
        if (!createdDoc) {
            throw new Error('Failed to retrieve created quiz set from database.');
        }

        const mappedQuizSet = mapQuizSetDocument(createdDoc);
        return { success: true, quizSet: mappedQuizSet };

    } catch (error) {
        console.error('[Generate Quiz Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to generate quiz.';
        return { success: false, message };
    }
}

// --- Action: Score Quiz Answer ---

interface ScoreQuizResult {
    success: boolean;
    is_correct?: boolean;
    llm_rationale?: string;
    message?: string;
}

export async function scoreQuizAnswerAction(
    quizSetId: string,
    questionIndex: number,
    userAnswer: string
): Promise<ScoreQuizResult> {
    if (!quizSetId || !ObjectId.isValid(quizSetId)) {
        return { success: false, message: 'Invalid Quiz Set ID.' };
    }
    if (questionIndex < 0 || questionIndex >= 10) { // Assuming 10 questions
        return { success: false, message: 'Invalid question index.' };
    }
    if (!userAnswer || !userAnswer.trim()) {
        return { success: false, message: 'Answer cannot be empty.' };
    }

    try {
        const { db } = await connectToDatabase();
        const quizSetsCollection = db.collection<QuizSetDocument>('quiz_sets');
        const attemptsCollection = db.collection<QuizAttemptDocument>('quiz_attempts');
        const openai = getOpenAIClient();

        // 1. Fetch the quiz set to get the correct answer
        const quizSet = await quizSetsCollection.findOne({ _id: new ObjectId(quizSetId) });
        if (!quizSet || !quizSet.questions || quizSet.questions.length <= questionIndex) {
            throw new Error('Quiz set or specific question not found.');
        }
        const correctAnswer = quizSet.questions[questionIndex].answer_text;

        // 2. Prompt the LLM for scoring
        // Using gpt-4o-mini as requested for scoring
        const scoringModel = 'gpt-4o-mini';
        const prompt = `Evaluate if the user's answer is semantically correct compared to the reference answer for a quiz question.

Reference Answer: "${correctAnswer}"
User's Answer: "${userAnswer}"

Is the user's answer correct? Respond ONLY with a JSON object containing a boolean field "is_correct" and an optional string field "rationale" explaining your decision briefly. Example: {"is_correct": true, "rationale": "The user provided the main point."} or {"is_correct": false, "rationale": "The user missed the key aspect mentioned in the reference."}`;

        const completion = await openai.chat.completions.create({
            model: scoringModel,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.2, // Low temperature for more deterministic scoring
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('OpenAI scoring did not return content.');
        }

        let parsedScoreData;
        try {
            parsedScoreData = JSON.parse(content);
        } catch (parseError) {
            console.error('Failed to parse OpenAI scoring JSON response:', parseError, 'Content:', content);
            throw new Error('Failed to parse scoring data from AI response.');
        }

        const validationResult = ScoreResponseSchema.safeParse(parsedScoreData);
        if (!validationResult.success) {
            console.error('OpenAI scoring response validation failed:', validationResult.error.errors);
            throw new Error('Scoring data is not in the expected format.');
        }

        const { is_correct, rationale } = validationResult.data;

        // 3. Store the attempt
        const newAttemptData: Omit<QuizAttemptDocument, '_id'> = {
            quiz_set_id: new ObjectId(quizSetId),
            question_index: questionIndex,
            user_answer: userAnswer.trim(),
            is_correct: is_correct,
            llm_rationale: rationale,
            createdAt: new Date(),
        };

        await attemptsCollection.insertOne(newAttemptData as QuizAttemptDocument);

        return { success: true, is_correct, llm_rationale: rationale };

    } catch (error) {
        console.error('[Score Quiz Answer Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to score answer.';
        return { success: false, message };
    }
}