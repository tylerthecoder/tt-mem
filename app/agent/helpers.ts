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
