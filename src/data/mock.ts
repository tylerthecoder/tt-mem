// src/data/mock.ts
import { Card, Deck } from '../types'; // Import from the new types file

// Define shared types
export interface MockCard {
    id: string;
    front_text: string;
    back_text: string;
}

export enum ReviewResult {
    EASY = "easy",
    MEDIUM = "medium",
    HARD = "hard",
    MISSED = "missed",
}

// Mock card data
const mockCardsData: Card[] = [
    { id: 'c1', front_text: 'What is JSX?', back_text: 'JavaScript XML' },
    { id: 'c2', front_text: 'What is useState?', back_text: 'A React Hook for state management' },
    { id: 'c3', front_text: 'What is useEffect?', back_text: 'A Hook for side effects' },
];

const mockDecksData: Deck[] = [
    { id: 'd1', name: 'React Basics' },
    { id: 'd2', name: 'TypeScript Fundamentals' },
    { id: 'd3', name: 'CSS Grids' },
];

// Mock function to simulate fetching deck cards
const simulateDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch all decks
export const fetchMockDecks = async (): Promise<Deck[]> => {
    console.log('Simulating fetch for all decks');
    await simulateDelay();
    return mockDecksData;
};

// Fetch cards for a specific deck
export const fetchMockDeckCards = async (deckId: string): Promise<Card[]> => {
    console.log(`Simulating fetch for deck: ${deckId}`);
    await simulateDelay();
    // In a real scenario, filter cards by deckId or fetch specific data
    // For now, return the same static mock card data for any deck
    return mockCardsData;
};

// Simulate login mutation
export const mockLogin = async (password: string): Promise<{ success: boolean; token?: string; message?: string }> => {
    console.log('Simulating login attempt');
    await simulateDelay(300);
    if (password === 'password') {
        // Simulate successful login
        return { success: true, token: 'mock-jwt-token' };
    } else {
        // Simulate failed login
        return { success: false, message: 'Invalid password (Hint: try \'password\')' };
    }
};