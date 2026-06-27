import { MongoClient } from 'mongodb';

// Cached connection promise
let cachedClient: MongoClient | null = null;
let cachedDbPromise: Promise<{ db: ReturnType<MongoClient['db']>, client: MongoClient }> | null = null;

function getMongoConfig() {
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME;

    if (!mongoUri) {
        throw new Error('Please define the MONGODB_URI environment variable inside .env');
    }
    if (!dbName) {
        throw new Error('Please define the MONGODB_DB_NAME environment variable inside .env');
    }

    return { mongoUri, dbName };
}

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

    const { mongoUri, dbName } = getMongoConfig();

    if (!cachedClient) {
        cachedClient = new MongoClient(mongoUri);
    }

    // Store the promise to avoid race conditions
    cachedDbPromise = cachedClient.connect().then(client => {
        const db = client.db(dbName);
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
