import { ObjectId } from 'mongodb'; // Change to regular import

/**
 * Maps a MongoDB document's ObjectId _id to a string id.
 * @param doc The MongoDB document (or null/undefined).
 * @returns The document with `id` as a string, excluding `_id`, or null.
 */
export function mapMongoId<T extends { _id?: ObjectId }>(doc: T | null | undefined): (Omit<T, '_id'> & { id: string }) | null {
    if (doc && doc._id instanceof ObjectId) { // Now ObjectId can be used as value
        const { _id, ...rest } = doc;
        return { ...rest, id: _id.toString() };
    }
    return null;
}