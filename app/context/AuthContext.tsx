"use client";
import React, { createContext, useState, ReactNode, useEffect } from 'react';
import { loginUserAction } from '@/actions/auth'; // Import server action

export interface AuthContextType {
    token: string | null;
    login: (password: string) => Promise<void>; // Keep promise for async handling
    logout: () => void;
    isLoading: boolean;
    isAuthInitializing: boolean;
    error: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isJwtExpired(token: string): boolean {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        const payload = JSON.parse(atob(parts[1]));
        if (!payload.exp) return false;
        // Add a 30-second buffer so we don't use a token that expires mid-request
        return Date.now() / 1000 > payload.exp - 30;
    } catch {
        return true;
    }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Load and validate token from localStorage on initial mount
    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');
        if (storedToken && !isJwtExpired(storedToken)) {
            setToken(storedToken);
        } else if (storedToken) {
            // Token exists but is expired — clear it so the UI reflects logged-out state
            localStorage.removeItem('authToken');
        }
        setIsAuthInitializing(false);
    }, []);

    const login = async (password: string): Promise<void> => { // Return Promise<void>
        setIsLoading(true);
        setError(null);
        try {
            // Call the server action
            const result = await loginUserAction(password);

            if (result.success && result.token) {
                setToken(result.token);
                localStorage.setItem('authToken', result.token); // Persist token
                setError(null); // Clear error on success
                // No need to return anything on success
            } else {
                // Throw an error with the message from the action result
                throw new Error(result.message || "Login failed: Unknown error");
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            console.error("Login error:", errorMessage);
            setError(errorMessage);
            setToken(null); // Ensure token is null on error
            localStorage.removeItem('authToken'); // Clear any potentially invalid token
            // Re-throw to allow login page to handle errors
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setToken(null);
        localStorage.removeItem('authToken'); // Remove token from storage
        // Optionally: redirect to login page or clear query cache
        // queryClient.clear(); // If using queryClient instance here
    };

    return (
        <AuthContext.Provider value={{ token, login, logout, isLoading, isAuthInitializing, error }}>
            {children}
        </AuthContext.Provider>
    );
};

