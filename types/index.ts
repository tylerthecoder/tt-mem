/**
 * Shared types for API and client
 */

export interface Deck {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface Card {
    id: string;
    deck_id: string;
    front_text: string;
    back_text: string;
    created_at: string;
    updated_at: string;
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
    timestamp: string;
}

// Request and response types for Deck endpoints
export interface CreateDeckRequest {
    name: string;
}

export interface UpdateDeckRequest {
    name: string;
}

export type DeckResponse = Deck;
export type DeckListResponse = Deck[];

// Request and response types for Card endpoints
export interface CreateCardRequest {
    front_text: string;
    back_text: string;
}

export interface UpdateCardRequest {
    front_text?: string;
    back_text?: string;
}

export type CardResponse = Card;
export type CardListResponse = Card[];

// Request and response types for ReviewEvent endpoints
export interface CreateReviewEventRequest {
    cardId: string;
    result: ReviewResult;
}

export type ReviewEventResponse = ReviewEvent;
export type ReviewEventListResponse = ReviewEvent[];