'use server'; // Mark this file as containing Server Actions

import jwt from 'jsonwebtoken';
// import { sql } from '@vercel/postgres'; // Removed unused import

// Re-usable function to get secrets (ensure env vars are set)
function getSecrets() {
    const masterPassword = process.env.MASTER_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!masterPassword || !jwtSecret) {
        console.error('Missing MASTER_PASSWORD or JWT_SECRET environment variable');
        throw new Error('Server configuration error');
    }
    return { masterPassword, jwtSecret };
}

interface LoginResult {
    success: boolean;
    token?: string;
    message?: string;
}

export async function loginUserAction(password: string): Promise<LoginResult> {
    try {
        const { masterPassword, jwtSecret } = getSecrets();

        if (!password) {
            return { success: false, message: 'Password is required' };
        }

        if (password === masterPassword) {
            const token = jwt.sign(
                { user: 'admin' }, // Simple payload
                jwtSecret,
                { expiresIn: '1h' }
            );
            return { success: true, token };
        } else {
            return { success: false, message: 'Invalid password' };
        }
    } catch (error) {
        console.error('[Auth Action Error]', error);
        // Return a generic error message to the client
        const message = error instanceof Error ? error.message : 'An unexpected error occurred during login.';
        // Avoid leaking specific server errors unless intended (like config error)
        if (message === 'Server configuration error') {
            return { success: false, message };
        }
        return { success: false, message: 'Login failed due to a server issue.' };
    }
}