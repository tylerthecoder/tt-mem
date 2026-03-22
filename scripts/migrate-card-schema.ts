/**
 * Migration: old card schema -> new prompt_type/prompt_content/answer_type/answer_content schema
 *
 * Run with: npx tsx scripts/migrate-card-schema.ts
 */

import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env manually (no dotenv dependency)
const envPath = resolve(process.cwd(), '.env');
try {
    const envContents = readFileSync(envPath, 'utf-8');
    for (const line of envContents.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
    }
} catch { /* .env may not exist */ }

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME!;

if (!MONGODB_URI || !MONGODB_DB_NAME) {
    console.error('MONGODB_URI and MONGODB_DB_NAME must be set in .env');
    process.exit(1);
}

async function migrateCards(client: MongoClient) {
    const db = client.db(MONGODB_DB_NAME);
    const cards = db.collection('cards');

    const allCards = await cards.find({}).toArray();
    console.log(`Found ${allCards.length} cards to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const card of allCards) {
        // Skip if already migrated
        if (card.prompt_type && card.answer_type) {
            skipped++;
            continue;
        }

        const oldFrontType: string = card.front_content_type ?? 'text';
        const oldAnswerMode: string = card.answer_mode ?? 'flip';

        // --- Prompt ---
        let prompt_type: string;
        let prompt_content: string;
        let prompt_text: string | undefined;

        switch (oldFrontType) {
            case 'image':
                prompt_type = 'image';
                prompt_content = card.front_image_url ?? '';
                prompt_text = card.front_text || undefined;
                break;
            case 'map_highlight':
                prompt_type = 'map';
                prompt_content = card.front_map_country_code ?? '';
                prompt_text = card.front_text || undefined;
                break;
            case 'text':
            default:
                prompt_type = 'text';
                prompt_content = card.front_text ?? '';
                prompt_text = undefined;
                break;
        }

        // --- Answer ---
        let answer_type: string;
        let answer_content: string | string[];
        let correct_index: number | undefined;

        switch (oldAnswerMode) {
            case 'type_in':
                answer_type = 'type_in';
                answer_content = card.correct_answer ?? card.back_text ?? '';
                break;
            case 'multiple_choice': {
                answer_type = 'multi';
                const correctAns = card.correct_answer ?? '';
                const oldChoices: string[] = card.choices ?? [];
                // Put correct answer at index 0, then the rest
                const otherChoices = oldChoices.filter((c: string) => c !== correctAns);
                answer_content = [correctAns, ...otherChoices];
                correct_index = 0;
                break;
            }
            case 'map_select':
                answer_type = 'map_select';
                answer_content = card.correct_country_code ?? '';
                break;
            case 'flip':
            default:
                answer_type = 'self_rate';
                answer_content = card.back_text ?? '';
                break;
        }

        const $set: Record<string, unknown> = {
            prompt_type,
            prompt_content,
            answer_type,
            answer_content,
        };
        if (prompt_text !== undefined) $set.prompt_text = prompt_text;
        if (correct_index !== undefined) $set.correct_index = correct_index;

        const $unset: Record<string, string> = {
            front_text: '',
            back_text: '',
            front_content_type: '',
            front_image_url: '',
            front_map_country_code: '',
            answer_mode: '',
            correct_answer: '',
            choices: '',
            correct_country_code: '',
        };

        await cards.updateOne({ _id: card._id }, { $set, $unset });
        migrated++;
    }

    console.log(`Cards: ${migrated} migrated, ${skipped} already up-to-date`);
}

async function migrateReviewEvents(client: MongoClient) {
    const db = client.db(MONGODB_DB_NAME);
    const reviews = db.collection('review_events');

    // Map old answer_mode values to new answer_type values
    const modeMapping: Record<string, string> = {
        flip: 'self_rate',
        type_in: 'type_in',
        multiple_choice: 'multi',
        map_select: 'map_select',
    };

    // Rename field and map values for docs that still have answer_mode
    const withAnswerMode = await reviews.find({ answer_mode: { $exists: true } }).toArray();
    console.log(`Found ${withAnswerMode.length} review events with answer_mode to migrate`);

    let migrated = 0;
    for (const doc of withAnswerMode) {
        const oldMode: string = doc.answer_mode ?? 'flip';
        const newType = modeMapping[oldMode] ?? 'self_rate';

        await reviews.updateOne(
            { _id: doc._id },
            {
                $set: { answer_type: newType },
                $unset: { answer_mode: '' },
            }
        );
        migrated++;
    }

    console.log(`Review events: ${migrated} migrated`);
}

async function main() {
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        console.log(`Database: ${MONGODB_DB_NAME}\n`);

        await migrateCards(client);
        await migrateReviewEvents(client);

        console.log('\nMigration complete!');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.close();
    }
}

main();
