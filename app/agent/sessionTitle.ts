import { DEFAULT_SESSION_TITLE } from '@/agent/constants';
import { deriveSessionTitle } from '@/agent/helpers';
import { touchSession } from '@/agent/store';

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
