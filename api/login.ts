import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

export default function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { password } = req.body;
    const masterPassword = process.env.MASTER_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!masterPassword || !jwtSecret) {
        console.error('Missing MASTER_PASSWORD or JWT_SECRET environment variable');
        return res.status(500).json({ message: 'Server configuration error' });
    }

    if (!password) {
        return res.status(400).json({ message: 'Password is required' });
    }

    if (password === masterPassword) {
        // Passwords match - generate JWT
        const token = jwt.sign(
            { user: 'admin' }, // Simple payload for single-user setup
            jwtSecret,
            { expiresIn: '1h' } // Token expires in 1 hour
        );
        return res.status(200).json({ token });
    } else {
        // Passwords don't match
        return res.status(401).json({ message: 'Invalid password' });
    }
}