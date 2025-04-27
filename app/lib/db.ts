import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env');
}
if (!MONGODB_DB_NAME) {
    throw new Error('Please define the MONGODB_DB_NAME environment variable inside .env');
}

// Assign checked env vars to local constants for type safety within functions
const checkedMongoUri = MONGODB_URI;
const checkedDbName = MONGODB_DB_NAME;

// Cached connection promise
let cachedClient: MongoClient | null = null;
let cachedDbPromise: Promise<{ db: ReturnType<MongoClient['db']>, client: MongoClient }> | null = null;

/**
 * Connects to the MongoDB database.
 * Reuses the connection if already established.
 * Note: In serverless environments, closing the connection might not be necessary
 * or even desired, as subsequent function invocations might reuse the connection.
 * This implementation does not automatically close the connection.
 */
export async function connectToDatabase() {
    if (cachedDbPromise) {
        return cachedDbPromise;
    }

    if (!cachedClient) {
        cachedClient = new MongoClient(checkedMongoUri);
    }

    // Store the promise to avoid race conditions
    cachedDbPromise = cachedClient.connect().then(client => {
        const db = client.db(checkedDbName);
        return { db, client };
    }).catch(err => {
        // Reset cache on connection error
        cachedClient = null;
        cachedDbPromise = null;
        console.error("Failed to connect to database:", err);
        throw err; // Re-throw error after logging
    });

    return cachedDbPromise;
}