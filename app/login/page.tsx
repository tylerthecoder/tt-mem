'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/Button';

export default function LoginPage() {
    const [password, setPassword] = useState<string>('');
    const { login, isLoading, error } = useAuth();
    const router = useRouter();

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            await login(password);
            router.push('/');
        } catch (err) {
            console.error("Login attempt failed in component:", err);
        }
    };

    return (
        <div className="max-w-sm mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded shadow-md">
            <h1 className="text-2xl font-bold text-center mb-6 text-primary">Login</h1>
            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label
                        htmlFor="password"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                        Master Password:
                    </label>
                    <input
                        type="password"
                        id="password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                </div>
                {error && (
                    <p className="text-red-500 text-sm text-center">Login failed: {error}</p>
                )}
                <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={isLoading}
                >
                    {isLoading ? 'Logging in...' : 'Log In'}
                </Button>
            </form>
        </div>
    );
}