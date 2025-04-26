import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { loginUser as apiLogin } from '../api/client'; // Import the actual API call

interface AuthContextType {
    token: string | null;
    login: (password: string) => Promise<void>;
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

    const login = async (password: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiLogin(password);
            if (response.token) {
                setToken(response.token);
                localStorage.setItem('authToken', response.token); // Persist token
                setError(null); // Clear error on success
            } else {
                throw new Error("Login failed: No token received");
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            console.error("Login error:", errorMessage);
            setError(errorMessage);
            setToken(null); // Ensure token is null on error
            localStorage.removeItem('authToken'); // Clear any potentially invalid token
            // Re-throw or handle as needed for UI feedback
            throw err; // Re-throw to allow login page to handle mutation state
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