import type { VercelRequest } from '@vercel/node';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// Define a basic type for the expected JWT payload
interface JwtPayload {
    user: string; // Based on what we sign in login.ts
    iat?: number; // Issued at (added by jwt.sign)
    exp?: number; // Expiration time (added by jwt.sign)
}

/**
 * Verifies the JWT from the Authorization header.
 * @param req - The Vercel request object.
 * @returns The decoded payload if the token is valid, otherwise null.
 */
export function authenticate(req: VercelRequest): JwtPayload | null {
    if (!JWT_SECRET) {
        console.error('JWT_SECRET is not set in environment variables.');
        return null;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null; // No token provided
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return null; // Malformed header
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Type assertion after successful verification
        return decoded as JwtPayload;
    } catch (error) {
        console.error('JWT verification failed:', error);
        return null; // Token is invalid or expired
    }
}