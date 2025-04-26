// src/api/client.ts

// import { Deck } from '@/../types'; // Reverted - import path issues

// Minimal inline type matching the expected structure (adjust if needed)
interface Deck {
    id: string;
    name: string;
    created_at?: string; // Optional fields based on API responses
    updated_at?: string;
}

// Function to get the stored auth token (implementation depends on storage method)
const getAuthToken = (): string | null => {
    // For now, let's assume it's stored in localStorage
    // In a real app, consider more secure storage or state management
    return localStorage.getItem('authToken');
};

// Base fetch function to handle common logic like headers and errors
const apiFetch = async (url: string, options: RequestInit = {}): Promise<unknown> => { // Use unknown
    const token = getAuthToken();
    // Use Record for type safety when adding arbitrary headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    // Add existing headers from options if they exist
    if (options.headers) {
        // HeadersInit can be Headers, Record<string, string>, or string[][]
        // Simple merge for Record<string, string> case (adjust if needed)
        if (typeof options.headers === 'object' && !(options.headers instanceof Headers) && !Array.isArray(options.headers)) {
            Object.assign(headers, options.headers);
        } else {
            // Handle Headers or string[][] if necessary, or log a warning
            console.warn('Unhandled headers type in apiFetch', options.headers);
        }
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers, // Now it's Record<string, string>
    });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch {
            // If response is not JSON (removed unused 'e')
            errorData = { message: `HTTP error! status: ${response.status}` };
        }
        console.error("API Error:", errorData);
        // Type assertion for error message
        const message = (errorData as { message?: string })?.message || `Request failed with status ${response.status}`;
        throw new Error(message);
    }

    // Handle 204 No Content specifically for DELETE
    if (response.status === 204) {
        return null; // Or return a success indicator if needed
    }

    // Only parse JSON if there's content
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return response.json();
    }
    return null; // Or handle non-JSON responses as needed

};

// --- Deck API Functions ---

export const fetchDecks = async (): Promise<Deck[]> => { // Use inline Deck[]
    // Type assertion needed because apiFetch returns unknown
    const data = await apiFetch('/api/decks');
    return data as Deck[]; // Use inline Deck[]
};

export const fetchDeckById = async (deckId: string): Promise<Deck> => { // Use inline Deck
    const data = await apiFetch(`/api/decks/${deckId}`);
    return data as Deck; // Use inline Deck
};

export const createDeck = async (name: string): Promise<Deck> => { // Use inline Deck
    const data = await apiFetch('/api/decks', {
        method: 'POST',
        body: JSON.stringify({ name }),
    });
    return data as Deck; // Use inline Deck
};

export const updateDeck = async (deckId: string, name: string): Promise<Deck> => { // Use inline Deck
    const data = await apiFetch(`/api/decks/${deckId}`, {
        method: 'PUT', // Or PATCH, depending on API implementation
        body: JSON.stringify({ name }),
    });
    return data as Deck; // Use inline Deck
};

export const deleteDeck = async (deckId: string): Promise<void> => {
    // apiFetch handles the 204 No Content response
    await apiFetch(`/api/decks/${deckId}`, {
        method: 'DELETE',
    });
};

// --- Auth API Functions ---

interface LoginResponse {
    token: string;
}

export const loginUser = async (password: string): Promise<LoginResponse> => {
    const response = await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
    });
    // Type assertion needed
    const loginData = response as { token?: string };
    if (!loginData?.token) {
        throw new Error("Login failed: No token received");
    }
    return { token: loginData.token }; // Return the correct structure
};