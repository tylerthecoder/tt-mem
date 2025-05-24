'use server';

import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db';
import { getOpenAIClient } from '@/lib/openai';
import { mapMongoId } from '@/lib/utils';
import type {
    ReadingSessionDocument,
    ReadingSession,
    ReadingAttemptDocument,
    ReadingAttempt,
    ReadingComprehensionQuestion,
} from '@/types';

// --- Zod Schemas for Validation ---

const ReadingComprehensionQuestionSchema = z.object({
    question_text: z.string().trim().min(1, 'Question text cannot be empty'),
    correct_answer: z.string().trim().min(1, 'Answer text cannot be empty'),
});

const ReadingContentResponseSchema = z.object({
    passage: z.string().trim().min(50, 'Passage must be at least 50 characters'),
    questions: z.array(ReadingComprehensionQuestionSchema).length(5, 'Must generate exactly 5 questions'),
});

// --- Helper: Map Reading Session Document ---
function mapReadingSessionDocument(doc: ReadingSessionDocument): ReadingSession {
    const mapped = mapMongoId(doc);
    return mapped as ReadingSession;
}

// --- Action: Generate Reading Content ---

interface GenerateReadingContentResult {
    success: boolean;
    session?: ReadingSession;
    message?: string;
}

export async function generateReadingContentAction(topic: string): Promise<GenerateReadingContentResult> {
    if (!topic || !topic.trim()) {
        return { success: false, message: 'Topic cannot be empty.' };
    }

    try {
        const openai = getOpenAIClient();
        const { db } = await connectToDatabase();
        const readingSessionsCollection = db.collection<ReadingSessionDocument>('reading_sessions');

        const prompt = `Generate reading comprehension content for the topic: "${topic}".

Create a short paragraph (150-250 words) about this topic that is informative and engaging. The paragraph should contain specific facts, dates, names, or details that can be tested.

Then create exactly 5 comprehension questions with specific answers based on the passage. The questions should:
- Test specific details from the passage
- Have clear, factual answers (not open-ended)
- Be answerable directly from the text
- Include a mix of who, what, when, where, why questions

Output Format:
Provide the output as a JSON object with "passage" (string) and "questions" (array of objects). Each question object must have "question_text" and "correct_answer" fields.

Example format: 
{
  "passage": "Your informative paragraph here...",
  "questions": [
    {
      "question_text": "What year was X founded?",
      "correct_answer": "1995"
    },
    ...
  ]
}`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.7,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('OpenAI did not return content.');
        }

        let parsedContent;
        try {
            parsedContent = JSON.parse(content);
        } catch (parseError) {
            console.error('Failed to parse OpenAI JSON response:', parseError, 'Content:', content);
            throw new Error('Failed to parse reading content from AI response.');
        }

        const validationResult = ReadingContentResponseSchema.safeParse(parsedContent);
        if (!validationResult.success) {
            console.error('OpenAI response validation failed:', validationResult.error.errors);
            throw new Error('Generated reading content is not in the expected format.');
        }

        const newReadingSessionData: Omit<ReadingSessionDocument, '_id'> = {
            topic: topic.trim(),
            passage: validationResult.data.passage,
            questions: validationResult.data.questions,
            createdAt: new Date(),
        };

        const insertResult = await readingSessionsCollection.insertOne(newReadingSessionData as ReadingSessionDocument);
        if (!insertResult.insertedId) {
            throw new Error('Failed to insert reading session into database.');
        }

        const createdDoc = await readingSessionsCollection.findOne({ _id: insertResult.insertedId });
        if (!createdDoc) {
            throw new Error('Failed to retrieve created reading session from database.');
        }

        const mappedSession = mapReadingSessionDocument(createdDoc);
        return { success: true, session: mappedSession };

    } catch (error) {
        console.error('[Generate Reading Content Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to generate reading content.';
        return { success: false, message };
    }
}

// --- Action: Submit Reading Attempt ---

interface SubmitReadingAttemptResult {
    success: boolean;
    attempt?: {
        id: string;
        total_score: number;
        answers: {
            question_index: number;
            user_answer: string;
            is_correct: boolean;
            correct_answer: string;
        }[];
    };
    message?: string;
}

export async function submitReadingAttemptAction(
    sessionId: string,
    readingTimeMs: number,
    userAnswers: { question_index: number; user_answer: string }[]
): Promise<SubmitReadingAttemptResult> {
    if (!sessionId || !ObjectId.isValid(sessionId)) {
        return { success: false, message: 'Invalid session ID.' };
    }
    if (readingTimeMs <= 0) {
        return { success: false, message: 'Invalid reading time.' };
    }
    if (!Array.isArray(userAnswers) || userAnswers.length === 0) {
        return { success: false, message: 'No answers provided.' };
    }

    try {
        const { db } = await connectToDatabase();
        const readingSessionsCollection = db.collection<ReadingSessionDocument>('reading_sessions');
        const readingAttemptsCollection = db.collection<ReadingAttemptDocument>('reading_attempts');

        // Fetch the reading session to get correct answers
        const session = await readingSessionsCollection.findOne({ _id: new ObjectId(sessionId) });
        if (!session) {
            throw new Error('Reading session not found.');
        }

        // Score the answers by simple string comparison (case-insensitive)
        const scoredAnswers = userAnswers.map(userAnswer => {
            const question = session.questions[userAnswer.question_index];
            if (!question) {
                throw new Error(`Question at index ${userAnswer.question_index} not found.`);
            }

            const isCorrect = userAnswer.user_answer.trim().toLowerCase() === 
                             question.correct_answer.trim().toLowerCase();

            return {
                question_index: userAnswer.question_index,
                user_answer: userAnswer.user_answer.trim(),
                is_correct: isCorrect,
                correct_answer: question.correct_answer,
            };
        });

        const totalScore = scoredAnswers.filter(answer => answer.is_correct).length;

        // Store the attempt
        const newAttemptData: Omit<ReadingAttemptDocument, '_id'> = {
            session_id: new ObjectId(sessionId),
            reading_time_ms: readingTimeMs,
            answers: scoredAnswers.map(answer => ({
                question_index: answer.question_index,
                user_answer: answer.user_answer,
                is_correct: answer.is_correct,
            })),
            total_score: totalScore,
            createdAt: new Date(),
        };

        const insertResult = await readingAttemptsCollection.insertOne(newAttemptData as ReadingAttemptDocument);
        if (!insertResult.insertedId) {
            throw new Error('Failed to store reading attempt.');
        }

        return {
            success: true,
            attempt: {
                id: insertResult.insertedId.toString(),
                total_score: totalScore,
                answers: scoredAnswers,
            },
        };

    } catch (error) {
        console.error('[Submit Reading Attempt Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to submit reading attempt.';
        return { success: false, message };
    }
}

// --- Action: Update Answer Score (Override) ---

interface UpdateAnswerScoreResult {
    success: boolean;
    message?: string;
}

export async function updateAnswerScoreAction(
    attemptId: string,
    questionIndex: number,
    newIsCorrect: boolean
): Promise<UpdateAnswerScoreResult> {
    if (!attemptId || !ObjectId.isValid(attemptId)) {
        return { success: false, message: 'Invalid attempt ID.' };
    }

    try {
        const { db } = await connectToDatabase();
        const readingAttemptsCollection = db.collection<ReadingAttemptDocument>('reading_attempts');

        // Find the attempt
        const attempt = await readingAttemptsCollection.findOne({ _id: new ObjectId(attemptId) });
        if (!attempt) {
            throw new Error('Reading attempt not found.');
        }

        // Update the specific answer
        const updatedAnswers = attempt.answers.map(answer => {
            if (answer.question_index === questionIndex) {
                return {
                    ...answer,
                    is_correct: newIsCorrect,
                    overridden: true,
                };
            }
            return answer;
        });

        // Recalculate total score
        const newTotalScore = updatedAnswers.filter(answer => answer.is_correct).length;

        // Update the document
        await readingAttemptsCollection.updateOne(
            { _id: new ObjectId(attemptId) },
            {
                $set: {
                    answers: updatedAnswers,
                    total_score: newTotalScore,
                }
            }
        );

        return { success: true };

    } catch (error) {
        console.error('[Update Answer Score Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to update answer score.';
        return { success: false, message };
    }
}

// --- Action: Get Past Reading Results ---

interface ReadingResult {
    session: ReadingSession;
    attempt: ReadingAttempt;
}

interface GetPastReadingResultsResult {
    success: boolean;
    results?: ReadingResult[];
    message?: string;
}

export async function getPastReadingResultsAction(): Promise<GetPastReadingResultsResult> {
    try {
        const { db } = await connectToDatabase();
        const readingSessionsCollection = db.collection<ReadingSessionDocument>('reading_sessions');
        const readingAttemptsCollection = db.collection<ReadingAttemptDocument>('reading_attempts');

        // Get all attempts with their sessions, sorted by most recent first
        const attempts = await readingAttemptsCollection
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        const results: ReadingResult[] = [];

        for (const attempt of attempts) {
            const session = await readingSessionsCollection.findOne({ _id: attempt.session_id });
            if (session) {
                const mappedAttempt = mapMongoId(attempt);
                results.push({
                    session: mapMongoId(session) as ReadingSession,
                    attempt: {
                        ...mappedAttempt,
                        session_id: attempt.session_id.toString(),
                    } as ReadingAttempt,
                });
            }
        }

        return { success: true, results };

    } catch (error) {
        console.error('[Get Past Reading Results Action Error]', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch past reading results.';
        return { success: false, message };
    }
}