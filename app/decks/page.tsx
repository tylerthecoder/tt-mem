'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import PageHeader, { PageHeaderActionLink } from '@/components/PageHeader';
import { useDecks } from '@/hooks/queryHooks';
import type { Deck } from '@/types';
import { getRecentlyPlayedDecksAction } from '@/actions/deckInsights';

export default function DecksHomePage() {
  const { data: decks, isLoading } = useDecks();
  const [recents, setRecents] = useState<{ deckId: string; deckName: string; lastPlayedAt: string }[]>([]);

  useEffect(() => {
    (async () => {
      const res = await getRecentlyPlayedDecksAction(6);
      if (res.success && res.recents) {
        setRecents(res.recents.map(r => ({ ...r, lastPlayedAt: new Date(r.lastPlayedAt).toISOString() })));
      }
    })();
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Decks"
        backHref="/"
        backLabel="Home"
        actions={
          <PageHeaderActionLink
            href="/decks/create"
            icon={<span aria-hidden="true">+</span>}
          >
            Create
          </PageHeaderActionLink>
        }
      />

      {recents.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Recently Played</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recents.map(r => (
              <div key={r.deckId} className="border rounded-lg p-4 bg-white shadow-sm flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-800">{r.deckName}</div>
                  <div className="text-xs text-gray-500">Last played: {new Date(r.lastPlayedAt).toLocaleString()}</div>
                </div>
                <Link href={`/deck/${r.deckId}/play`} passHref legacyBehavior>
                  <Button as="a" variant="primary" size="sm">Play</Button>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">All Decks</h2>
        {isLoading && <div className="text-gray-500">Loading decks…</div>}
        {!isLoading && decks && decks.length === 0 && (
          <div className="text-gray-500">No decks yet. Create one to get started.</div>
        )}
        {!isLoading && decks && decks.length > 0 && (
          <ul className="space-y-2">
            {decks.map((deck: Deck) => (
              <li key={deck.id} className="bg-white border rounded-lg shadow-sm p-4 flex items-center justify-between">
                <div className="font-medium text-gray-800 mr-4 truncate">{deck.name}</div>
                <div className="flex gap-2">
                  <Link href={`/deck/${deck.id}/overview`} passHref legacyBehavior>
                    <Button as="a" variant="default" size="sm">Open</Button>
                  </Link>
                  <Link href={`/deck/${deck.id}/play`} passHref legacyBehavior>
                    <Button as="a" variant="primary" size="sm">Play</Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}
