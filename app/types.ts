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
    deck_id: string; // Ensure this is consistently set/required
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