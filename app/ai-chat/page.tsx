'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import { useAuth } from '@/context/useAuth';
import { useCreateAIChatSessionMutation, useAIChatMessages, useSendAIChatMessageMutation, usePendingToolCalls, useApproveToolCallMutation, useAIChatSessions } from '@/hooks/queryHooks';

export default function AIChatPage() {
    const { token } = useAuth();
    const [sessionId, setSessionId] = useState<string | null>(null);
    const createSession = useCreateAIChatSessionMutation();

    useEffect(() => {
        if (!sessionId && token && !createSession.isPending) {
            createSession.mutate(undefined, {
                onSuccess: (data) => setSessionId(data.id)
            });
        }
    }, [sessionId, token, createSession]);

    const { data: messages } = useAIChatMessages(sessionId || undefined);
    const { data: sessions, refetch: refetchSessions } = useAIChatSessions();
    const { data: pending } = usePendingToolCalls(sessionId || undefined);
    const sendMutation = useSendAIChatMessageMutation(sessionId || '');
    const approveMutation = useApproveToolCallMutation(sessionId || '');

    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLTextAreaElement | null>(null);

    const handleSend = () => {
        if (!input.trim() || !sessionId) return;
        sendMutation.mutate({ text: input.trim() });
        setInput('');
        inputRef.current?.focus();
    };

    return (
        <div className="fixed inset-0 flex">
            {/* Sidebar: Sessions */}
            <div className="w-72 border-r bg-white flex flex-col">
                <div className="p-3 border-b flex items-center justify-between">
                    <span className="font-semibold">Chats</span>
                    <Button size="sm" onClick={() => { setSessionId(null); refetchSessions(); createSession.mutate(undefined, { onSuccess: (d) => setSessionId(d.id) }); }}>New</Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <ul>
                        {sessions?.map((s) => (
                            <li key={s.id} className={`px-3 py-2 cursor-pointer ${s.id === sessionId ? 'bg-primary/10' : ''}`} onClick={() => setSessionId(s.id)}>
                                <div className="text-sm font-medium truncate">{s.title || 'AI Assistant'}</div>
                                <div className="text-xs text-gray-500">{new Date(s.updatedAt).toLocaleString()}</div>
                            </li>
                        ))}
                        {!sessions || sessions.length === 0 ? (
                            <li className="p-3 text-sm text-gray-500">No chats yet</li>
                        ) : null}
                    </ul>
                </div>
                <div className="p-3 border-t">
                    <Link href="/">
                        <Button variant="secondary" size="sm" className="w-full">Back</Button>
                    </Link>
                </div>
            </div>

            {/* Main: Chat */}
            <div className="flex-1 flex flex-col bg-gray-50">
                <div className="p-4 border-b bg-white">
                    <h1 className="text-lg font-semibold">AI Assistant</h1>
                </div>
                {!token && (
                    <div className="p-6">Please login to use the AI chat.</div>
                )}
                {token && !sessionId && (
                    <div className="p-6">Starting session...</div>
                )}
                {token && sessionId && (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages?.map((m) => (
                                <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                                    <div className={`inline-block px-3 py-2 rounded ${m.role === 'user' ? 'bg-primary text-white' : 'bg-white border'}`}>
                                        <pre className="whitespace-pre-wrap break-words font-sans text-sm">{m.content}</pre>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t bg-white">
                            <div className="flex gap-2 items-end">
                                <textarea
                                    ref={inputRef}
                                    className="flex-1 border rounded p-2"
                                    rows={2}
                                    placeholder="Ask me anything about your decks..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                />
                                <Button onClick={handleSend} variant="primary" disabled={sendMutation.isPending || !input.trim()}>Send</Button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Right: Pending approvals */}
            <div className="w-80 border-l bg-white flex flex-col">
                <div className="p-3 border-b font-semibold">Pending approvals</div>
                <div className="flex-1 overflow-y-auto p-3">
                    {(!pending || pending.length === 0) && (
                        <p className="text-sm text-gray-500">No pending tools.</p>
                    )}
                    <ul className="space-y-2">
                        {pending?.map((t) => (
                            <li key={t.id} className="border rounded p-2">
                                <div className="text-sm font-medium">{t.name}</div>
                                <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(t.arguments, null, 2)}</pre>
                                <div className="flex gap-2 mt-2">
                                    <Button size="sm" variant="primary" onClick={() => approveMutation.mutate({ toolCallId: t.id, approve: true })}>Approve</Button>
                                    <Button size="sm" variant="default" onClick={() => approveMutation.mutate({ toolCallId: t.id, approve: false })}>Reject</Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}


