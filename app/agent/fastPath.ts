import { DEFAULT_SESSION_TITLE } from '@/agent/constants';
import { deriveSessionTitle, isSimpleDeckListRequest } from '@/agent/helpers';
import { persistMessage, touchSession } from '@/agent/store';
import { fetchDecksAction } from '@/actions/decks';

export async function maybeHandleFastPath(sessionId: string, userText: string) {
    if (!isSimpleDeckListRequest(userText)) {
        return null;
    }

    const deckResult = await fetchDecksAction();
    if (!deckResult.success || !deckResult.decks) {
        const message = deckResult.message || 'I could not load your decks right now.';
        await persistMessage(sessionId, 'assistant', message);
        return { success: false, message };
    }

    const assistantText = deckResult.decks.length
        ? `Here are your decks:\n${deckResult.decks.map((deck) => `- ${deck.name} (${deck.id})`).join('\n')}`
        : 'You do not have any decks yet.';

    await persistMessage(sessionId, 'assistant', assistantText);
    return { success: true, assistantText, pendingToolCalls: [] };
}

export async function maybeAssignSessionTitle(
    sessionId: string,
    currentTitle: string | undefined,
    userText: string
) {
    if (currentTitle && currentTitle !== DEFAULT_SESSION_TITLE) {
        return;
    }

    await touchSession(sessionId, { title: deriveSessionTitle(userText) });
}
