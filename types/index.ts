/**
 * Shared types for API and client
 */

export type PromptType = 'text' | 'image' | 'map';
export type AnswerType = 'self_rate' | 'type_in' | 'multi' | 'map_select';

export interface Deck {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface Card {
    id: string;
    deck_id: string;
    prompt_type: PromptType;
    prompt_content: string;
    prompt_text?: string;
    answer_type: AnswerType;
    answer_content: string | string[];
    correct_index?: number;
    extra_context?: string;
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

export interface CreateDeckRequest {
    name: string;
}

export interface UpdateDeckRequest {
    name: string;
}

export type DeckResponse = Deck;
export type DeckListResponse = Deck[];

export interface CreateCardRequest {
    prompt_type: PromptType;
    prompt_content: string;
    prompt_text?: string;
    answer_type: AnswerType;
    answer_content: string | string[];
    correct_index?: number;
    extra_context?: string;
}

export interface UpdateCardRequest {
    prompt_type?: PromptType;
    prompt_content?: string;
    prompt_text?: string;
    answer_type?: AnswerType;
    answer_content?: string | string[];
    correct_index?: number;
    extra_context?: string;
}

export type CardResponse = Card;
export type CardListResponse = Card[];

export interface CreateReviewEventRequest {
    cardId: string;
    result: ReviewResult;
}

export type ReviewEventResponse = ReviewEvent;
export type ReviewEventListResponse = ReviewEvent[];
