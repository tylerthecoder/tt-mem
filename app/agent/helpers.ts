import { DEFAULT_SESSION_TITLE } from '@/agent/constants';

export function deriveSessionTitle(message: string) {
    const normalized = message
        .replace(/\s+/g, ' ')
        .replace(/^["'`]+|["'`]+$/g, '')
        .trim();

    if (!normalized) {
        return DEFAULT_SESSION_TITLE;
    }

    return normalized.length > 60 ? `${normalized.slice(0, 57)}...` : normalized;
}

export function undefinedIfNull<T>(value: T | null | undefined): T | undefined {
    return value ?? undefined;
}

export function isSimpleDeckListRequest(message: string) {
    const normalized = message.toLowerCase().trim();
    return [
        /^(list|show)\s+(all\s+)?(my\s+)?decks[\s.!?]*$/,
        /^(what|which)\s+decks\s+do\s+i\s+have[\s.!?]*$/,
        /^show\s+me\s+(all\s+)?(my\s+)?decks[\s.!?]*$/,
    ].some((pattern) => pattern.test(normalized));
}

export function shouldEnableWebSearch(message: string) {
    const normalized = message.toLowerCase();
    return [
        'web',
        'internet',
        'online',
        'current',
        'latest',
        'today',
        'recent',
        'news',
        'source',
        'sources',
        'look up',
        'search for',
        'find information',
    ].some((keyword) => normalized.includes(keyword));
}
