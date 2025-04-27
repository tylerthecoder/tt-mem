import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@/types';

/**
 * Verifies the JWT token.
 * @param token The JWT token string (potentially undefined).
 * @returns The decoded JwtPayload if valid, otherwise null.
 */
export function verifyAuthToken(token: string | undefined): JwtPayload | null {
    if (!token) return null;
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error('JWT_SECRET environment variable not set.');
        return null;
    }
    try {
        const decoded = jwt.verify(token, jwtSecret);
        // Basic check if the decoded object looks like our payload
        if (typeof decoded === 'object' && decoded !== null && 'user' in decoded) {
            return decoded as JwtPayload;
        }
        console.error('JWT verification resulted in unexpected payload structure.');
        return null;
    } catch (error) {
        // Log specific JWT errors like TokenExpiredError, JsonWebTokenError
        if (error instanceof jwt.TokenExpiredError) {
            console.log('JWT expired:', error.message);
        } else if (error instanceof jwt.JsonWebTokenError) {
            console.error('JWT verification failed:', error.message);
        } else {
            console.error('An unknown error occurred during JWT verification:', error);
        }
        return null;
    }
}