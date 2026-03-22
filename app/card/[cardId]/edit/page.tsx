'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCard, useUpdateCardMutation } from '@/hooks/queryHooks';
import { useAuth } from '@/context/useAuth';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner'; // Assuming a Spinner component exists
import PageHeader from '@/components/PageHeader';

export default function EditCardPage() {
    const params = useParams();
    const router = useRouter();
    const { token } = useAuth();
    const cardId = typeof params?.cardId === 'string' ? params.cardId : undefined;

    const { data: card, isLoading: isLoadingCard, error: cardError } = useCard(cardId, token ?? undefined);
    const updateMutation = useUpdateCardMutation();

    const [promptContent, setPromptContent] = useState('');
    const [answerContent, setAnswerContent] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        if (card) {
            setPromptContent(card.prompt_content);
            setAnswerContent(
                typeof card.answer_content === 'string'
                    ? card.answer_content
                    : JSON.stringify(card.answer_content)
            );
        }
    }, [card]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLocalError(null);
        if (!cardId || !card?.deck_id) {
            setLocalError('Card or Deck ID is missing.');
            return;
        }
        if (!promptContent.trim() || !answerContent.trim()) {
            setLocalError('Prompt and Answer cannot be empty.');
            return;
        }

        const trimmedAnswer = answerContent.trim();
        let answerPayload: string | string[] = trimmedAnswer;
        try {
            const parsed = JSON.parse(trimmedAnswer) as unknown;
            if (Array.isArray(parsed) && parsed.every((x): x is string => typeof x === 'string')) {
                answerPayload = parsed;
            }
        } catch {
            // keep string
        }

        updateMutation.mutate(
            {
                cardId,
                deckId: card.deck_id, // Pass the deckId from the fetched card
                promptContent: promptContent.trim(),
                answerContent: answerPayload,
                token: token ?? undefined,
            },
            {
                onSuccess: () => {
                    router.push(`/card/${cardId}`);
                },
                onError: (error) => {
                    setLocalError(`Failed to update card: ${error.message}`);
                },
            }
        );
    };

    const isLoading = isLoadingCard || updateMutation.isPending;
    const error = cardError || updateMutation.error || localError;

    if (isLoadingCard) {
        return (
            <div className="flex justify-center items-center py-10">
                <Spinner /> <span className="ml-2 text-gray-500">Loading card details...</span>
            </div>
        );
    }

    if (!cardId) {
        return <div className="text-center text-red-500">Invalid Card ID</div>;
    }

    if (!card) {
        return <div className="text-center text-red-500">{(cardError as Error)?.message || 'Card not found or unauthorized.'}</div>;
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <PageHeader
                title="Edit Card"
                backHref={`/card/${cardId}`}
                backLabel="Card"
            />

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
                <div>
                    <label htmlFor="promptContent" className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
                    <textarea
                        id="promptContent"
                        rows={4}
                        value={promptContent}
                        onChange={(e) => setPromptContent(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label htmlFor="answerContent" className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
                    <textarea
                        id="answerContent"
                        rows={4}
                        value={answerContent}
                        onChange={(e) => setAnswerContent(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                        disabled={isLoading}
                    />
                </div>

                {error && (
                    <div className="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded">
                        Error: {typeof error === 'string' ? error : (error as Error).message}
                    </div>
                )}

                <div className="flex justify-end">
                    <Button type="submit" variant="primary" disabled={isLoading}>
                        {isLoading ? <><Spinner size="sm" /> Saving...</> : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </div>
    );
}