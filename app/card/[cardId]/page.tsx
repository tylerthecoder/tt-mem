'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { getCardPublicAction } from '@/actions/cards';
import { useCardReviewHistory } from '@/hooks/queryHooks';
import PageHeader, { PageHeaderActionLink } from '@/components/PageHeader';
import SkeletonLine from '@/components/SkeletonLine';
import { ReviewResult, type Card, type ReviewEvent } from '@/types';

function resultLabel(e: ReviewEvent): { text: string; color: string } {
    if (e.is_correct === true) return { text: 'Correct', color: 'text-green-600' };
    if (e.is_correct === false) return { text: 'Incorrect', color: 'text-red-600' };
    switch (e.result) {
        case ReviewResult.EASY: return { text: 'Easy', color: 'text-green-600' };
        case ReviewResult.MEDIUM: return { text: 'Medium', color: 'text-blue-600' };
        case ReviewResult.HARD: return { text: 'Hard', color: 'text-orange-500' };
        case ReviewResult.MISSED: return { text: 'Missed', color: 'text-red-600' };
        default: return { text: '—', color: 'text-gray-400' };
    }
}

function resultDotColor(e: ReviewEvent): string {
    if (e.is_correct === true) return 'bg-green-500';
    if (e.is_correct === false) return 'bg-red-500';
    switch (e.result) {
        case ReviewResult.EASY: return 'bg-green-500';
        case ReviewResult.MEDIUM: return 'bg-blue-500';
        case ReviewResult.HARD: return 'bg-orange-400';
        case ReviewResult.MISSED: return 'bg-red-500';
        default: return 'bg-gray-300';
    }
}

function IconEdit() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
        </svg>
    );
}

export default function CardDetailPage() {
    const params = useParams();
    const cardId = typeof params?.cardId === 'string' ? params.cardId : undefined;
    const [showRaw, setShowRaw] = React.useState(false);

    const { data: card, isLoading: cardLoading } = useQuery<Card | null>({
        queryKey: ['card-public', cardId],
        queryFn: () => (cardId ? getCardPublicAction(cardId) : Promise.resolve(null)),
        enabled: !!cardId,
        staleTime: 5 * 60 * 1000,
    });

    const { data: reviews, isLoading: reviewsLoading } = useCardReviewHistory(cardId);

    if (!cardId) return <div className="text-center text-red-500">Invalid card ID.</div>;

    const isImage = card?.prompt_type === 'image';

    return (
        <div className="space-y-5">
            <PageHeader
                title={cardLoading ? 'Card' : ((card?.prompt_text || card?.prompt_content)?.slice(0, 50) || 'Card')}
                backHref={card?.deck_id ? `/deck/${card.deck_id}/overview` : '/decks'}
                backLabel="Deck"
                actions={
                    <>
                        <button
                            onClick={() => setShowRaw(v => !v)}
                            className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-primary"
                        >
                            {showRaw ? 'Hide raw' : 'View raw'}
                        </button>
                        <PageHeaderActionLink href={`/card/${cardId}/edit`} icon={<IconEdit />}>
                            Edit
                        </PageHeaderActionLink>
                    </>
                }
            />

            {/* Card content */}
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-white px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">Front</p>
                    {cardLoading ? (
                        <SkeletonLine width="w-64" height="h-5" />
                    ) : isImage && card?.prompt_content ? (
                        <img
                            src={card.prompt_content}
                            alt={card.prompt_text || card.prompt_content || 'Card image'}
                            className="max-w-sm rounded border border-gray-100"
                        />
                    ) : (
                        <p className="text-gray-800 whitespace-pre-wrap">{card?.prompt_text || card?.prompt_content}</p>
                    )}
                    {card?.extra_context && (
                        <p className="mt-2 text-sm text-gray-500 italic">{card.extra_context}</p>
                    )}
                </div>

                <div className="bg-white px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">Back</p>
                    {cardLoading ? (
                        <SkeletonLine width="w-48" height="h-5" />
                    ) : (
                        <p className="text-gray-800 whitespace-pre-wrap">
                            {card?.answer_content === undefined
                                ? ''
                                : typeof card.answer_content === 'string'
                                    ? card.answer_content
                                    : card.answer_content.join(', ')}
                        </p>
                    )}
                </div>

                {!cardLoading && card?.answer_type && (
                    <div className="bg-white px-4 py-2">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500">
                            {card.answer_type}
                        </span>
                    </div>
                )}
            </div>

            {/* Raw JSON */}
            {showRaw && card && (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Raw</p>
                    </div>
                    <pre className="bg-white px-4 py-4 text-xs text-gray-700 overflow-x-auto leading-relaxed">
                        {JSON.stringify(card, null, 2)}
                    </pre>
                </div>
            )}

            {/* Review history */}
            <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Review History{reviews && reviews.length > 0 ? ` (${reviews.length})` : ''}
                </p>

                {reviewsLoading && (
                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white px-4 py-2.5">
                                <div className="w-2 h-2 rounded-full bg-gray-200 animate-pulse shrink-0" />
                                <SkeletonLine width={i % 2 === 0 ? 'w-16' : 'w-12'} height="h-3" />
                                <SkeletonLine width="w-24" height="h-3" />
                            </div>
                        ))}
                    </div>
                )}

                {!reviewsLoading && (!reviews || reviews.length === 0) && (
                    <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
                        No reviews yet.
                    </div>
                )}

                {!reviewsLoading && reviews && reviews.length > 0 && (
                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                        {reviews.map((r) => {
                            const { text, color } = resultLabel(r);
                            return (
                                <div key={r.id} className="flex items-center gap-3 bg-white px-4 py-2.5">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${resultDotColor(r)}`} />
                                    <span className={`text-sm font-medium w-20 shrink-0 ${color}`}>{text}</span>
                                    {r.answer_type && (
                                        <span className="text-xs text-gray-400 px-1.5 py-0.5 rounded bg-gray-100 shrink-0">
                                            {r.answer_type}
                                        </span>
                                    )}
                                    {r.user_answer && (
                                        <span className="text-xs text-gray-500 truncate flex-1">"{r.user_answer}"</span>
                                    )}
                                    <span className="text-xs text-gray-400 shrink-0 ml-auto">
                                        {formatDistanceToNow(new Date(r.timestamp), { addSuffix: true })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
