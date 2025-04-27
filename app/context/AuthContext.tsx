import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
// Remove old client import
// import { loginUser as apiLogin } from '../api/client';
import { loginUserAction } from '@/actions/auth'; // Import server action

interface AuthContextType {
    token: string | null;
    login: (password: string) => Promise<void>; // Keep promise for async handling
    logout: () => void;
    isLoading: boolean;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Attempt to load token from localStorage on initial mount
    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
            setToken(storedToken);
        }
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
        <AuthContext.Provider value={{ token, login, logout, isLoading, error }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};