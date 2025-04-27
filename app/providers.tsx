'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext'; // Use path alias

// Create a single client instance
const queryClient = new QueryClient();

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                {children}
            </AuthProvider>
        </QueryClientProvider>
    );
}