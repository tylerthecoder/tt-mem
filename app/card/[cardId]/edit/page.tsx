'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCard, useUpdateCardMutation } from '@/hooks/queryHooks';
import { useAuth } from '@/context/useAuth';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner'; // Assuming a Spinner component exists

export default function EditCardPage() {
    const params = useParams();
    const router = useRouter();
    const { token } = useAuth();
    const cardId = typeof params?.cardId === 'string' ? params.cardId : undefined;

    const { data: card, isLoading: isLoadingCard, error: cardError } = useCard(cardId, token ?? undefined);
    const updateMutation = useUpdateCardMutation();

    const [frontText, setFrontText] = useState('');
    const [backText, setBackText] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        if (card) {
            setFrontText(card.front_text);
            setBackText(card.back_text);
        }
    }, [card]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLocalError(null);
        if (!cardId || !card?.deck_id) {
            setLocalError('Card or Deck ID is missing.');
            return;
        }
        if (!frontText.trim() || !backText.trim()) {
            setLocalError('Front and Back text cannot be empty.');
            return;
        }

        updateMutation.mutate(
            {
                cardId,
                deckId: card.deck_id, // Pass the deckId from the fetched card
                frontText: frontText.trim(),
                backText: backText.trim(),
                token: token ?? undefined,
            },
            {
                onSuccess: () => {
                    // Optionally show a success message
                    alert('Card updated successfully!');
                    // Redirect back or to deck overview
                    router.push(`/deck/${card.deck_id}/edit`); // Go back to deck edit page
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
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-gray-800">Edit Card</h1>
                <Link href={`/deck/${card.deck_id}/edit`} passHref legacyBehavior>
                    <Button as="a" variant="secondary" size="sm">Back to Deck Edit</Button>
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
                <div>
                    <label htmlFor="frontText" className="block text-sm font-medium text-gray-700 mb-1">Front Text</label>
                    <textarea
                        id="frontText"
                        rows={4}
                        value={frontText}
                        onChange={(e) => setFrontText(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label htmlFor="backText" className="block text-sm font-medium text-gray-700 mb-1">Back Text</label>
                    <textarea
                        id="backText"
                        rows={4}
                        value={backText}
                        onChange={(e) => setBackText(e.target.value)}
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