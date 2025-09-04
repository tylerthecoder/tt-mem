'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import { useDecks, useImportDeckMutation } from '@/hooks/queryHooks';
import type { Deck } from '@/types';
import { getRecentlyPlayedDecksAction } from '@/actions/deckInsights';
import { useAuth } from '@/context/useAuth';

interface ImportDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (deckName: string, cardsData: { front: string; back: string }[]) => void;
  isLoading: boolean;
}

function ImportDeckModal({ isOpen, onClose, onSubmit, isLoading }: ImportDeckModalProps) {
  const [deckName, setDeckName] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!deckName.trim()) { setError('Deck name is required'); return; }
    let parsed: unknown;
    try { parsed = JSON.parse(jsonInput); } catch { setError('Invalid JSON'); return; }
    if (!Array.isArray(parsed)) { setError('JSON must be an array of cards'); return; }
    const cards = (parsed as any[]).map((c, i) => {
      if (!c || typeof c.front !== 'string' || typeof c.back !== 'string') {
        throw new Error(`Card ${i + 1} is missing front/back strings`);
      }
      return { front: c.front.trim(), back: c.back.trim() };
    });
    onSubmit(deckName.trim(), cards);
  };

  const close = () => { setDeckName(''); setJsonInput(''); setError(null); onClose(); };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Import Deck</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm text-gray-700 mb-1 block">Deck Name</label>
            <input className="w-full border rounded px-3 py-2" value={deckName} onChange={(e) => setDeckName(e.target.value)} disabled={isLoading} />
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-1 block">Cards JSON</label>
            <textarea className="w-full h-40 border rounded px-3 py-2 font-mono text-sm" value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} disabled={isLoading} />
            <p className="text-xs text-gray-500 mt-1">[{`{ "front": "Question", "back": "Answer" }`}, ...]</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="default" onClick={close} disabled={isLoading}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={isLoading || !deckName.trim() || !jsonInput.trim()}>{isLoading ? 'Importing…' : 'Import'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DecksHomePage() {
  const { data: decks, isLoading } = useDecks();
  const importMutation = useImportDeckMutation();
  const { token } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [recents, setRecents] = useState<{ deckId: string; deckName: string; lastPlayedAt: string }[]>([]);

  useEffect(() => {
    (async () => {
      const res = await getRecentlyPlayedDecksAction(6);
      if (res.success && res.recents) {
        setRecents(res.recents.map(r => ({ ...r, lastPlayedAt: new Date(r.lastPlayedAt).toISOString() })));
      }
    })();
  }, []);

  const handleImport = (deckName: string, cardsData: { front: string; back: string }[]) => {
    if (!token) return alert('Please login to import decks.');
    importMutation.mutate({ deckName, cardsData, token }, {
      onSuccess: () => { setModalOpen(false); },
      onError: (e) => alert(e.message || 'Import failed'),
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Decks</h1>
        <div className="flex gap-2">
          <Link href="/play/select" passHref legacyBehavior>
            <Button as="a" variant="secondary">Play Selected</Button>
          </Link>
          <Link href="/deck/ai-generate" passHref legacyBehavior>
            <Button as="a" variant="secondary">Create with AI</Button>
          </Link>
          <Button variant="primary" onClick={() => setModalOpen(true)}>Import Deck</Button>
        </div>
      </div>

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
          <div className="text-gray-500">No decks yet. Import or create one above.</div>
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

      <ImportDeckModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleImport} isLoading={importMutation.isPending} />
    </div>
  );
}

