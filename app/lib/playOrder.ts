function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export interface PlayOrderKey {
    deckId?: string;
    strategy: string;
    deckIds?: string[];
    timeframe?: number;
}

function buildStorageKey(params: PlayOrderKey): string {
    if (params.deckId) {
        let key = `play-order:deck:${params.deckId}:${params.strategy}`;
        if (params.timeframe) key += `:${params.timeframe}`;
        return key;
    }
    const decksPart = params.deckIds ? [...params.deckIds].sort().join(',') : 'all';
    return `play-order:global:${params.strategy}:${decksPart}`;
}

/**
 * Returns cards in a stable shuffled order. If a matching order exists
 * in localStorage (same set of card IDs), it reuses that order.
 * Otherwise it shuffles fresh and persists the new order.
 */
export function getOrCreatePlayOrder<T extends { id: string }>(
    cards: T[],
    keyParams: PlayOrderKey,
): T[] {
    if (cards.length === 0) return [];

    const key = buildStorageKey(keyParams);
    const currentIds = new Set(cards.map(c => c.id));

    try {
        const stored = localStorage.getItem(key);
        if (stored) {
            const savedIds: string[] = JSON.parse(stored);
            const savedSet = new Set(savedIds);

            if (savedSet.size === currentIds.size && savedIds.every(id => currentIds.has(id))) {
                const cardMap = new Map(cards.map(c => [c.id, c]));
                return savedIds.map(id => cardMap.get(id)!);
            }
        }
    } catch {
        // localStorage unavailable or data corrupted — fall through to fresh shuffle
    }

    return reshuffleAndSave(cards, keyParams);
}

/**
 * Shuffles cards into a new random order, saves to localStorage,
 * and returns the new sequence.
 */
export function reshuffleAndSave<T extends { id: string }>(
    cards: T[],
    keyParams: PlayOrderKey,
): T[] {
    const shuffled = shuffleArray(cards);
    const key = buildStorageKey(keyParams);
    try {
        localStorage.setItem(key, JSON.stringify(shuffled.map(c => c.id)));
    } catch {
        // ignore storage errors
    }
    return shuffled;
}

export function clearPlayOrder(keyParams: PlayOrderKey): void {
    const key = buildStorageKey(keyParams);
    try {
        localStorage.removeItem(key);
    } catch {
        // ignore
    }
}
