import type { ObjectId } from 'mongodb';

// --- Database/API Interfaces ---

// Represents the data structure *after* mapping from DB (_id -> id)
export interface Deck {
    id: string;
    name: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Card {
    id: string;
    deck_id: string;
    front_text: string;
    back_text: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export enum ReviewResult {
    EASY = "easy",
    MEDIUM = "medium",
    HARD = "hard",
    MISSED = "missed",
}

export interface ReviewEvent {
    id: string;
    card_id: string;
    result: ReviewResult;
    timestamp: Date; // Use Date
}

// --- MongoDB Specific Document Types (Optional but helpful) ---
// Represent structure in the DB before mapping
export interface DeckDocument {
    _id: ObjectId;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CardDocument {
    _id: ObjectId;
    deck_id: ObjectId; // Store deck ID as ObjectId in DB
    front_text: string;
    back_text: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ReviewEventDocument {
    _id: ObjectId;
    card_id: ObjectId;
    result: ReviewResult;
    timestamp: Date;
}

// --- Utility/Auth Types ---

export interface JwtPayload {
    user: string;
    iat?: number;
    exp?: number;
}


export interface SingleImportCardData {
    front: string;
    back: string;
}

export interface ReviewHistoryEntry {
    eventId: string;
    cardId: string;
    cardFront: string;
    cardBack: string;
    result: ReviewResult;
    timestamp: Date;
}

// --- AI Quiz Types ---

export interface QuestionAnswerPair {
    question_text: string;
    answer_text: string;
    extra_context?: string;
}

// Represents the structure stored in the 'quiz_sets' MongoDB collection
export interface QuizSetDocument {
    _id?: ObjectId;         // Optional because it's generated by MongoDB
    topic: string;
    questions: QuestionAnswerPair[]; // Array of question/answer objects
    createdAt: Date;
}

// Client-facing type after mapping _id to id
export interface QuizSet {
    id: string;
    topic: string;
    questions: QuestionAnswerPair[];
    createdAt: Date;
}

// Represents the structure stored in the 'quiz_attempts' MongoDB collection
export interface QuizAttemptDocument {
    _id?: ObjectId;
    quiz_set_id: ObjectId;  // Link to the QuizSetDocument
    question_index: number; // 0-based index of the question in the set
    user_answer: string;
    is_correct: boolean;
    llm_rationale?: string; // Optional explanation from the scoring LLM
    createdAt: Date;
}

// Client-facing type (potentially, might not be needed if only scoring result is returned)
export interface QuizAttempt {
    id: string;
    quiz_set_id: string;
    question_index: number;
    user_answer: string;
    is_correct: boolean;
    llm_rationale?: string;
    createdAt: Date;
}

// --- AI Deck Edit Types ---

export interface AICreateCardSuggestion {
    type: 'create';
    front_text: string;
    back_text: string;
    extra_context?: string; // Consistent with Quiz generation
}

export interface AIUpdateCardSuggestion {
    type: 'update';
    cardId: string;          // ID of the card to update
    front_text?: string;     // Optional: only provide if changing
    back_text?: string;      // Optional: only provide if changing
    extra_context?: string;  // Optional: only provide if changing
}

export interface AIDeleteCardSuggestion {
    type: 'delete';
    cardId: string;          // ID of the card to delete
}

export type AICardEditSuggestion = AICreateCardSuggestion | AIUpdateCardSuggestion | AIDeleteCardSuggestion;

// --- Reading Comprehension Types ---

export interface ReadingComprehensionQuestion {
    question_text: string;
    correct_answer: string;
}

export interface ReadingSessionDocument {
    _id?: ObjectId;
    topic: string;
    passage: string;
    questions: ReadingComprehensionQuestion[];
    user_id?: string; // Optional for future user association
    createdAt: Date;
}

export interface ReadingSession {
    id: string;
    topic: string;
    passage: string;
    questions: ReadingComprehensionQuestion[];
    user_id?: string;
    createdAt: Date;
}

export interface ReadingAttemptDocument {
    _id?: ObjectId;
    session_id: ObjectId;
    reading_time_ms: number; // Time spent reading the passage
    answers: {
        question_index: number;
        user_answer: string;
        is_correct: boolean;
        overridden?: boolean; // User corrected the AI scoring
    }[];
    total_score: number; // Calculated score out of total questions
    createdAt: Date;
}

export interface ReadingAttempt {
    id: string;
    session_id: string;
    reading_time_ms: number;
    answers: {
        question_index: number;
        user_answer: string;
        is_correct: boolean;
        overridden?: boolean;
    }[];
    total_score: number;
    createdAt: Date;
}