'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/useAuth';
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
        <div className="max-w-sm mx-auto mt-16 p-6 bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-center mb-6 text-primary">Login</h1>
            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                    <label
                        htmlFor="password"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Master Password:
                    </label>
                    <input
                        type="password"
                        id="password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary focus:border-primary"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                </div>
                {error && (
                    <p className="text-red-600 text-sm text-center p-2 bg-red-50 rounded border border-red-200">Login failed: {error}</p>
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