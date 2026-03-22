'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import PageHeader, { PageHeaderActionLink } from '@/components/PageHeader';
import SkeletonLine from '@/components/SkeletonLine';
import { useDecks } from '@/hooks/queryHooks';
import type { Deck } from '@/types';
import { getRecentlyPlayedDecksAction } from '@/actions/deckInsights';

const rowActionClass =
    'inline-flex items-center gap-1.5 rounded px-2 py-1 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-primary';

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}


function IconPlay() {
    return (
        <svg width="11" height="11" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true" className="shrink-0">
            <path d="M1 1.5L11 7L1 12.5V1.5Z" />
        </svg>
    );
}

const RECENT_CHIP_WIDTHS = ['w-28', 'w-40', 'w-24', 'w-36', 'w-32', 'w-20'];

export default function DecksHomePage() {
    const { data: decks, isLoading: decksLoading } = useDecks();

    const { data: recentsData, isLoading: recentsLoading } = useQuery({
        queryKey: ['deck-recents'],
        queryFn: async () => {
            const res = await getRecentlyPlayedDecksAction(500);
            if (!res.success || !res.recents) return [];
            return res.recents.map(r => ({ ...r, lastPlayedAt: new Date(r.lastPlayedAt).toISOString() }));
        },
    });

    const recents = recentsData?.slice(0, 6) ?? [];
    const lastPlayed = new Map((recentsData ?? []).map(r => [r.deckId, r.lastPlayedAt]));

    return (
        <div className="space-y-5">
            <PageHeader
                title="Decks"
                backHref="/"
                backLabel="Home"
                actions={
                    <PageHeaderActionLink
                        href="/decks/create"
                        icon={<span aria-hidden="true">+</span>}
                    >
                        New Deck
                    </PageHeaderActionLink>
                }
            />

            {(recentsLoading || recents.length > 0) && (
                <section>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">Recently Played</p>
                    <div className="flex flex-wrap gap-2">
                        {recentsLoading
                            ? RECENT_CHIP_WIDTHS.map((w, i) => (
                                <div
                                    key={i}
                                    className={`${w} h-7 rounded-full bg-gray-200 animate-pulse`}
                                    aria-hidden="true"
                                />
                            ))
                            : recents.map(r => (
                                <Link
                                    key={r.deckId}
                                    href={`/deck/${r.deckId}/play`}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors"
                                >
                                    <IconPlay />
                                    {r.deckName}
                                </Link>
                            ))
                        }
                    </div>
                </section>
            )}

            <section>
                {(recentsLoading || recents.length > 0) && (
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">All Decks</p>
                )}

                {decksLoading && (
                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between bg-white px-4 py-2">
                                <SkeletonLine width={i % 2 === 0 ? 'w-48' : 'w-36'} height="h-4" />
                                <SkeletonLine width="w-20" height="h-5" />
                            </div>
                        ))}
                    </div>
                )}

                {!decksLoading && decks && decks.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
                        <p className="text-sm text-gray-400">No decks yet.</p>
                        <Link href="/decks/create" className={`${rowActionClass} mt-3 mx-auto`}>
                            + Create your first deck
                        </Link>
                    </div>
                )}

                {!decksLoading && decks && decks.length > 0 && (
                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                        {decks.map((deck: Deck) => {
                            const played = lastPlayed.get(deck.id);
                            return (
                                <div
                                    key={deck.id}
                                    className="flex items-center justify-between bg-white px-4 py-2 hover:bg-gray-50 transition-colors"
                                >
                                    <Link
                                        href={`/deck/${deck.id}/overview`}
                                        className="min-w-0 mr-4 flex items-baseline gap-2 flex-1"
                                    >
                                        <span className="font-medium text-gray-800 truncate">{deck.name}</span>
                                        {played && (
                                            <span className="text-xs text-gray-400 shrink-0">{timeAgo(played)}</span>
                                        )}
                                    </Link>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <Link href={`/deck/${deck.id}/play`} className={rowActionClass}>
                                            <IconPlay />
                                            Quick Play
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
