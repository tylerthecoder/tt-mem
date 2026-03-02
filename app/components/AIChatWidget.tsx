'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/useAuth';
import {
    useCreateAIChatSessionMutation,
    useAIChatMessages,
    useSendAIChatMessageMutation,
    usePendingToolCalls,
    useApproveToolCallMutation,
    useAIChatSessions,
} from '@/hooks/queryHooks';

// --- Inline Tool Call Card ---
function ToolCallCard({
    tc,
    autoApprove,
    sessionId,
}: {
    tc: { id: string; name: string; arguments: unknown };
    autoApprove: boolean;
    sessionId: string;
}) {
    const approveMutation = useApproveToolCallMutation(sessionId);
    const [expanded, setExpanded] = useState(false);
    const [handled, setHandled] = useState(false);
    const autoApprovedRef = useRef(false);

    // Auto-approve effect
    useEffect(() => {
        if (autoApprove && !handled && !autoApprovedRef.current) {
            autoApprovedRef.current = true;
            approveMutation.mutate(
                { toolCallId: tc.id, approve: true },
                { onSuccess: () => setHandled(true) }
            );
        }
    }, [autoApprove, handled, tc.id, approveMutation]);

    const handleApprove = () => {
        approveMutation.mutate(
            { toolCallId: tc.id, approve: true },
            { onSuccess: () => setHandled(true) }
        );
    };

    const handleReject = () => {
        approveMutation.mutate(
            { toolCallId: tc.id, approve: false },
            { onSuccess: () => setHandled(true) }
        );
    };

    return (
        <div className="my-1 border border-amber-300 bg-amber-50 rounded-lg p-2 text-sm">
            <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-800">{tc.name}</span>
                <button
                    className="text-xs text-gray-500 hover:text-gray-700"
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? 'Hide' : 'Show'} args
                </button>
            </div>
            {expanded && (
                <pre className="mt-1 text-xs bg-white border rounded p-1.5 overflow-auto max-h-32">
                    {JSON.stringify(tc.arguments, null, 2)}
                </pre>
            )}
            {handled || autoApprovedRef.current ? (
                <div className="mt-1.5 text-xs font-medium text-green-700">
                    {autoApprove ? 'Auto-approved' : 'Approved'}
                </div>
            ) : (
                <div className="mt-1.5 flex gap-2">
                    <button
                        className="px-2 py-0.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        onClick={handleApprove}
                        disabled={approveMutation.isPending}
                    >
                        Approve
                    </button>
                    <button
                        className="px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                        onClick={handleReject}
                        disabled={approveMutation.isPending}
                    >
                        Reject
                    </button>
                </div>
            )}
        </div>
    );
}

// --- Tool Result Card (rendered for role='tool' messages) ---
function ToolResultCard({ content }: { content: string }) {
    let parsed: { tool?: string; result?: unknown; error?: string } | null = null;
    try {
        parsed = JSON.parse(content);
    } catch {
        // not JSON
    }

    if (!parsed) {
        return (
            <div className="my-1 text-xs text-gray-500 italic">{content}</div>
        );
    }

    const isError = !!parsed.error;
    return (
        <div
            className={`my-1 border rounded-lg p-2 text-xs ${
                isError
                    ? 'border-red-300 bg-red-50 text-red-800'
                    : 'border-green-300 bg-green-50 text-green-800'
            }`}
        >
            <div className="font-semibold">
                {isError ? 'Error' : 'Result'}: {parsed.tool}
            </div>
            {parsed.error && <div className="mt-0.5">{parsed.error}</div>}
            {parsed.result != null && (
                <pre className="mt-0.5 overflow-auto max-h-24 whitespace-pre-wrap">
                    {String(typeof parsed.result === 'string'
                        ? parsed.result
                        : JSON.stringify(parsed.result, null, 2))}
                </pre>
            )}
        </div>
    );
}

// --- Main Widget ---
export default function AIChatWidget() {
    const { token } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [autoApprove, setAutoApprove] = useState(false);
    const [input, setInput] = useState('');
    const [showSessionPicker, setShowSessionPicker] = useState(false);

    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const createSession = useCreateAIChatSessionMutation();
    const { data: sessions, refetch: refetchSessions } = useAIChatSessions();
    const { data: messages } = useAIChatMessages(sessionId || undefined);
    const sendMutation = useSendAIChatMessageMutation(sessionId || '');
    const { data: pending } = usePendingToolCalls(sessionId || undefined);

    // Auto-create session on first open
    useEffect(() => {
        if (isOpen && !sessionId && token && !createSession.isPending) {
            createSession.mutate(undefined, {
                onSuccess: (data) => {
                    setSessionId(data.id);
                    refetchSessions();
                },
            });
        }
    }, [isOpen, sessionId, token]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, pending]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && sessionId) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, sessionId]);

    const handleSend = useCallback(() => {
        if (!input.trim() || !sessionId || sendMutation.isPending) return;
        sendMutation.mutate({ text: input.trim() });
        setInput('');
    }, [input, sessionId, sendMutation]);

    const handleNewChat = () => {
        createSession.mutate(undefined, {
            onSuccess: (data) => {
                setSessionId(data.id);
                refetchSessions();
                setShowSessionPicker(false);
            },
        });
    };

    const handleSelectSession = (id: string) => {
        setSessionId(id);
        setShowSessionPicker(false);
    };

    if (!token) return null;

    return (
        <>
            {/* Floating toggle button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                    aria-label="Open AI Chat"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                    </svg>
                </button>
            )}

            {/* Chat window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[520px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b bg-gray-50 flex-shrink-0">
                        <span className="font-semibold text-sm flex-1 truncate">
                            AI Assistant
                        </span>

                        {/* Session picker */}
                        <div className="relative">
                            <button
                                className="text-xs px-2 py-1 bg-white border rounded hover:bg-gray-100"
                                onClick={() => setShowSessionPicker(!showSessionPicker)}
                            >
                                Chats
                            </button>
                            {showSessionPicker && (
                                <div className="absolute right-0 top-full mt-1 w-56 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                                    <button
                                        className="w-full text-left px-3 py-2 text-xs font-semibold text-primary hover:bg-gray-50 border-b"
                                        onClick={handleNewChat}
                                    >
                                        + New Chat
                                    </button>
                                    {sessions?.map((s) => (
                                        <button
                                            key={s.id}
                                            className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                                                s.id === sessionId
                                                    ? 'bg-primary/10 font-medium'
                                                    : ''
                                            }`}
                                            onClick={() => handleSelectSession(s.id)}
                                        >
                                            <div className="truncate">
                                                {s.title || 'AI Assistant'}
                                            </div>
                                            <div className="text-gray-400 text-[10px]">
                                                {new Date(s.updatedAt).toLocaleString()}
                                            </div>
                                        </button>
                                    ))}
                                    {(!sessions || sessions.length === 0) && (
                                        <div className="px-3 py-2 text-xs text-gray-400">
                                            No chats yet
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Auto-approve toggle */}
                        <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="accent-primary"
                                checked={autoApprove}
                                onChange={(e) => setAutoApprove(e.target.checked)}
                            />
                            Auto
                        </label>

                        {/* Close button */}
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                setShowSessionPicker(false);
                            }}
                            className="text-gray-400 hover:text-gray-600 ml-1"
                            aria-label="Close chat"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Messages area */}
                    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                        {!sessionId && (
                            <div className="text-sm text-gray-400 py-4 text-center">
                                Starting session...
                            </div>
                        )}
                        {sessionId &&
                            messages?.map((m) => {
                                if (m.role === 'tool') {
                                    return (
                                        <ToolResultCard
                                            key={m.id}
                                            content={m.content}
                                        />
                                    );
                                }
                                if (m.role === 'system') {
                                    return (
                                        <div
                                            key={m.id}
                                            className="text-xs text-gray-400 italic text-center"
                                        >
                                            {m.content}
                                        </div>
                                    );
                                }
                                return (
                                    <div
                                        key={m.id}
                                        className={
                                            m.role === 'user'
                                                ? 'text-right'
                                                : 'text-left'
                                        }
                                    >
                                        <div
                                            className={`inline-block max-w-[85%] px-3 py-1.5 rounded-lg text-sm ${
                                                m.role === 'user'
                                                    ? 'bg-primary text-white'
                                                    : 'bg-gray-100 border text-gray-900'
                                            }`}
                                        >
                                            <pre className="whitespace-pre-wrap break-words font-sans">
                                                {m.content}
                                            </pre>
                                        </div>
                                    </div>
                                );
                            })}

                        {/* Pending tool calls inline */}
                        {sessionId &&
                            pending?.map((tc) => (
                                <ToolCallCard
                                    key={tc.id}
                                    tc={tc}
                                    autoApprove={autoApprove}
                                    sessionId={sessionId}
                                />
                            ))}

                        {/* Sending indicator */}
                        {sendMutation.isPending && (
                            <div className="text-left">
                                <div className="inline-block px-3 py-1.5 rounded-lg text-sm bg-gray-100 border text-gray-400">
                                    Thinking...
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input bar */}
                    {sessionId && (
                        <div className="px-3 py-2 border-t bg-white flex-shrink-0">
                            <div className="flex gap-2 items-end">
                                <textarea
                                    ref={inputRef}
                                    className="flex-1 border rounded-lg p-2 text-sm resize-none"
                                    rows={2}
                                    placeholder="Ask about your decks..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (
                                            e.key === 'Enter' &&
                                            !e.shiftKey
                                        ) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={
                                        sendMutation.isPending ||
                                        !input.trim()
                                    }
                                    className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
