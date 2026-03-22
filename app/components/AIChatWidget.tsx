'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import {
    DefaultChatTransport,
    lastAssistantMessageIsCompleteWithApprovalResponses,
    type UIMessage,
} from 'ai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import {
    createAIChatSessionAction,
    getAIChatMessagesAction,
    listAIChatSessionsAction,
} from '@/agent/chatActions';
import { useAuth } from '@/context/useAuth';
import type { AIChatSession } from '@/types';

const aiChatKeys = {
    sessions: ['aiChat', 'sessions'] as const,
    messages: (sessionId: string | undefined) => ['aiChat', 'messages', sessionId] as const,
};

type ToolUIPart = {
    type: string;
    state?: string;
    toolCallId?: string;
    input?: unknown;
    output?: unknown;
    errorText?: string;
    approval?: {
        id: string;
    };
};

function useCreateAIChatSessionMutation() {
    const queryClient = useQueryClient();
    const { token } = useAuth();

    return useMutation<{ id: string }, Error, void>({
        mutationFn: async () => {
            const res = await createAIChatSessionAction(token ?? undefined);
            if (!res.success || !res.session) {
                throw new Error(res.message || 'Failed to create session');
            }

            return { id: res.session.id };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: aiChatKeys.sessions });
        },
    });
}

function useAIChatSessions() {
    const { token } = useAuth();

    return useQuery<AIChatSession[], Error>({
        queryKey: aiChatKeys.sessions,
        queryFn: async () => {
            const res = await listAIChatSessionsAction(token ?? undefined);
            if (!res.success || !res.sessions) {
                throw new Error(res.message || 'Failed to load sessions');
            }

            return res.sessions;
        },
        enabled: !!token,
        staleTime: 0,
    });
}

function useAIChatMessages(sessionId: string | undefined) {
    const { token } = useAuth();

    return useQuery<UIMessage[], Error>({
        queryKey: aiChatKeys.messages(sessionId),
        queryFn: async () => {
            if (!sessionId) {
                throw new Error('Session id required');
            }

            const res = await getAIChatMessagesAction(sessionId, token ?? undefined);
            if (!res.success || !res.messages) {
                throw new Error(res.message || 'Failed to load messages');
            }

            return res.messages;
        },
        enabled: !!sessionId && !!token,
        staleTime: 0,
    });
}

function formatSessionTime(value: Date | string) {
    return new Date(value).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function getMessageText(message: UIMessage) {
    return message.parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('\n')
        .trim();
}

function getToolParts(message: UIMessage): ToolUIPart[] {
    return message.parts.filter((part) => part.type.startsWith('tool-')) as ToolUIPart[];
}

function prettifyToolName(toolName: string) {
    return toolName
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    return value as Record<string, unknown>;
}

function formatValue(value: unknown) {
    if (value == null) return 'None';
    if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
}

function summarizeCard(card: Record<string, unknown>) {
    const promptType = formatValue(card.prompt_type);
    const answerType = formatValue(card.answer_type);
    const promptContent = typeof card.prompt_content === 'string' ? card.prompt_content : '';
    const answerContent = Array.isArray(card.answer_content)
        ? card.answer_content.join(', ')
        : typeof card.answer_content === 'string'
            ? card.answer_content
            : '';

    return {
        title: promptContent || 'Untitled card',
        meta: `${promptType} -> ${answerType}`,
        answer: answerContent || 'No answer content',
    };
}

function ToolSection({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="grid grid-cols-[96px_1fr] gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-current/70">
                {label}
            </div>
            <div className="min-w-0 text-gray-800">{value}</div>
        </div>
    );
}

function ToolCardList({
    items,
}: {
    items: { title: string; subtitle?: string; detail?: string }[];
}) {
    return (
        <div className="space-y-2">
            {items.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-lg border border-white/70 bg-white/80 p-2 text-gray-800">
                    <div className="font-medium">{item.title}</div>
                    {item.subtitle && <div className="mt-0.5 text-[11px] text-gray-600">{item.subtitle}</div>}
                    {item.detail && <div className="mt-1 text-xs text-gray-700">{item.detail}</div>}
                </div>
            ))}
        </div>
    );
}

function ToolPayloadPrettyView({
    toolName,
    payload,
    mode,
}: {
    toolName: string;
    payload: unknown;
    mode: 'input' | 'output';
}) {
    const record = asRecord(payload);

    if (toolName === 'ViewAllDecks' && mode === 'output') {
        const decks = Array.isArray(record?.decks) ? record.decks : [];
        return (
            <ToolCardList
                items={decks.map((deck) => {
                    const item = asRecord(deck) ?? {};
                    return {
                        title: typeof item.name === 'string' ? item.name : 'Untitled deck',
                        subtitle: typeof item.id === 'string' ? `Deck ID: ${item.id}` : undefined,
                    };
                })}
            />
        );
    }

    if (toolName === 'ViewDeck') {
        if (mode === 'input') {
            return <ToolSection label="Deck ID" value={formatValue(record?.deckId)} />;
        }

        const deck = asRecord(record?.deck);
        const cards = Array.isArray(record?.cards) ? record.cards : [];
        return (
            <div className="space-y-3">
                <ToolSection label="Deck" value={typeof deck?.name === 'string' ? deck.name : 'Unknown deck'} />
                <ToolSection label="Deck ID" value={formatValue(deck?.id)} />
                <ToolSection label="Cards" value={`${cards.length} total`} />
                {cards.length > 0 && (
                    <ToolCardList
                        items={cards.slice(0, 4).map((card) => {
                            const summary = summarizeCard(asRecord(card) ?? {});
                            return {
                                title: summary.title,
                                subtitle: summary.meta,
                                detail: summary.answer,
                            };
                        })}
                    />
                )}
            </div>
        );
    }

    if (toolName === 'CreateDeck') {
        if (mode === 'input') {
            const cards = Array.isArray(record?.cards) ? record.cards : [];
            return (
                <div className="space-y-3">
                    <ToolSection label="Name" value={formatValue(record?.name)} />
                    <ToolSection label="Cards" value={`${cards.length} to create`} />
                    {cards.length > 0 && (
                        <ToolCardList
                            items={cards.slice(0, 4).map((card) => {
                                const summary = summarizeCard(asRecord(card) ?? {});
                                return {
                                    title: summary.title,
                                    subtitle: summary.meta,
                                    detail: summary.answer,
                                };
                            })}
                        />
                    )}
                </div>
            );
        }

        const deck = asRecord(record?.deck);
        return (
            <div className="space-y-3">
                <ToolSection label="Deck" value={typeof deck?.name === 'string' ? deck.name : 'Created deck'} />
                <ToolSection label="Deck ID" value={formatValue(deck?.id)} />
                <ToolSection label="Cards created" value={formatValue(record?.cardsCreated)} />
            </div>
        );
    }

    if (toolName === 'AddCard') {
        if (mode === 'input') {
            const summary = summarizeCard(record ?? {});
            return (
                <div className="space-y-3">
                    <ToolSection label="Deck ID" value={formatValue(record?.deckId)} />
                    <ToolSection label="Card" value={summary.title} />
                    <ToolSection label="Modes" value={summary.meta} />
                    <ToolSection label="Answer" value={summary.answer} />
                </div>
            );
        }

        const summary = summarizeCard(record ?? {});
        return (
            <div className="space-y-3">
                <ToolSection label="Card" value={summary.title} />
                <ToolSection label="Card ID" value={formatValue(record?.id)} />
                <ToolSection label="Modes" value={summary.meta} />
            </div>
        );
    }

    if (toolName === 'BulkAddCards') {
        if (mode === 'input') {
            const cards = Array.isArray(record?.cards) ? record.cards : [];
            return (
                <div className="space-y-3">
                    <ToolSection label="Deck ID" value={formatValue(record?.deckId)} />
                    <ToolSection label="Cards" value={`${cards.length} to add`} />
                    {cards.length > 0 && (
                        <ToolCardList
                            items={cards.slice(0, 4).map((card) => {
                                const summary = summarizeCard(asRecord(card) ?? {});
                                return {
                                    title: summary.title,
                                    subtitle: summary.meta,
                                    detail: summary.answer,
                                };
                            })}
                        />
                    )}
                </div>
            );
        }

        return <ToolSection label="Added" value={`${formatValue(record?.cardsAdded)} cards`} />;
    }

    if (toolName === 'EditCard') {
        if (mode === 'input') {
            const changes = [
                record?.prompt_content ? 'prompt' : null,
                record?.answer_content ? 'answer' : null,
                record?.prompt_type ? 'prompt type' : null,
                record?.answer_type ? 'answer type' : null,
                record?.correct_index != null ? 'correct index' : null,
                record?.extra_context ? 'extra context' : null,
            ].filter(Boolean).join(', ');

            return (
                <div className="space-y-3">
                    <ToolSection label="Deck ID" value={formatValue(record?.deckId)} />
                    <ToolSection label="Card ID" value={formatValue(record?.cardId)} />
                    <ToolSection label="Changes" value={changes || 'No visible changes'} />
                </div>
            );
        }

        const summary = summarizeCard(record ?? {});
        return (
            <div className="space-y-3">
                <ToolSection label="Card" value={summary.title} />
                <ToolSection label="Card ID" value={formatValue(record?.id)} />
                <ToolSection label="Modes" value={summary.meta} />
            </div>
        );
    }

    if (toolName === 'MultiEditCard') {
        if (mode === 'input') {
            const edits = Array.isArray(record?.edits) ? record.edits : [];
            return (
                <div className="space-y-3">
                    <ToolSection label="Deck ID" value={formatValue(record?.deckId)} />
                    <ToolSection label="Edits" value={`${edits.length} cards`} />
                    {edits.length > 0 && (
                        <ToolCardList
                            items={edits.slice(0, 4).map((edit) => {
                                const item = asRecord(edit) ?? {};
                                return {
                                    title: `Card ${formatValue(item.cardId)}`,
                                    detail: [
                                        item.prompt_content ? 'prompt' : null,
                                        item.answer_content ? 'answer' : null,
                                        item.prompt_type ? 'prompt type' : null,
                                        item.answer_type ? 'answer type' : null,
                                    ].filter(Boolean).join(', ') || 'Update fields',
                                };
                            })}
                        />
                    )}
                </div>
            );
        }

        const outcomes = Array.isArray(payload) ? payload : [];
        return (
            <ToolCardList
                items={outcomes.map((outcome) => {
                    const item = asRecord(outcome) ?? {};
                    return {
                        title: `Card ${formatValue(item.cardId)}`,
                        subtitle: item.success ? 'Updated successfully' : 'Update failed',
                        detail: typeof item.message === 'string' ? item.message : undefined,
                    };
                })}
            />
        );
    }

    if (toolName === 'RemoveCard') {
        if (mode === 'input') {
            return (
                <div className="space-y-3">
                    <ToolSection label="Deck ID" value={formatValue(record?.deckId)} />
                    <ToolSection label="Card ID" value={formatValue(record?.cardId)} />
                </div>
            );
        }

        return <ToolSection label="Result" value={formatValue(payload)} />;
    }

    if (toolName === 'web_search') {
        const searchQuery = typeof record?.action === 'object'
            ? asRecord(record.action)?.query
            : record?.query;
        const sources = Array.isArray(record?.sources) ? record.sources : [];

        return (
            <div className="space-y-3">
                {searchQuery != null && <ToolSection label="Query" value={formatValue(searchQuery)} />}
                {sources.length > 0 && (
                    <ToolCardList
                        items={sources.slice(0, 5).map((source) => {
                            const item = asRecord(source) ?? {};
                            return {
                                title: typeof item.title === 'string'
                                    ? item.title
                                    : typeof item.url === 'string'
                                        ? item.url
                                        : 'Source',
                                subtitle: typeof item.url === 'string' ? item.url : undefined,
                            };
                        })}
                    />
                )}
            </div>
        );
    }

    if (toolName === 'ViewAllDecks' && mode === 'input') {
        return <ToolSection label="Action" value="List all decks" />;
    }

    if (typeof payload === 'string') {
        return <div className="text-gray-800">{payload}</div>;
    }

    if (record) {
        return (
            <div className="space-y-2">
                {Object.entries(record).slice(0, 8).map(([key, value]) => (
                    <ToolSection key={key} label={key} value={formatValue(value)} />
                ))}
            </div>
        );
    }

    if (Array.isArray(payload)) {
        return (
            <ToolCardList
                items={payload.slice(0, 6).map((item, index) => ({
                    title: `Item ${index + 1}`,
                    detail: typeof item === 'string' ? item : JSON.stringify(item),
                }))}
            />
        );
    }

    return <div className="text-gray-700">No details available.</div>;
}

function ToolCardFrame({
    tone,
    statusLabel,
    toolName,
    payload,
    mode,
    errorText,
    children,
}: {
    tone: 'warning' | 'success' | 'error' | 'neutral';
    statusLabel: string;
    toolName: string;
    payload: unknown;
    mode: 'input' | 'output';
    errorText?: string;
    children?: React.ReactNode;
}) {
    const [showRawJson, setShowRawJson] = useState(false);

    const toneClassName = {
        warning: 'border-amber-300 bg-amber-50 text-amber-950',
        success: 'border-green-300 bg-green-50 text-green-900',
        error: 'border-red-300 bg-red-50 text-red-900',
        neutral: 'border-gray-200 bg-gray-50 text-gray-900',
    }[tone];

    return (
        <div className={`rounded-xl border p-3 text-sm shadow-sm ${toneClassName}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-current/70">
                        {statusLabel}
                    </div>
                    <div className="mt-1 font-semibold">{prettifyToolName(toolName)}</div>
                </div>
                <button
                    type="button"
                    className="text-xs text-current/80 hover:text-current"
                    onClick={() => setShowRawJson((prev) => !prev)}
                >
                    {showRawJson ? 'Show pretty view' : 'Show raw JSON'}
                </button>
            </div>
            {errorText && <div className="mt-2 text-xs">{errorText}</div>}
            <div className="mt-3">
                {showRawJson ? (
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-white/70 bg-white/80 p-2 text-xs text-gray-700">
                        {typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)}
                    </pre>
                ) : (
                    <div className="space-y-3">
                        <ToolPayloadPrettyView toolName={toolName} payload={payload} mode={mode} />
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}

function ToolResultCard({
    toolName,
    output,
    errorText,
}: {
    toolName: string;
    output?: unknown;
    errorText?: string;
}) {
    const isError = Boolean(errorText);

    return (
        <ToolCardFrame
            tone={isError ? 'error' : 'success'}
            statusLabel={isError ? 'Action error' : 'Action result'}
            toolName={toolName}
            payload={output}
            mode="output"
            errorText={errorText}
        />
    );
}

function ToolApprovalCard({
    toolName,
    input,
    approvalId,
    autoApprove,
    addToolApprovalResponse,
}: {
    toolName: string;
    input: unknown;
    approvalId: string;
    autoApprove: boolean;
    addToolApprovalResponse: (response: { id: string; approved: boolean; reason?: string }) => void | PromiseLike<void>;
}) {
    const [handled, setHandled] = useState(false);
    const autoApprovedRef = useRef(false);

    useEffect(() => {
        if (autoApprove && !handled && !autoApprovedRef.current) {
            autoApprovedRef.current = true;
            Promise.resolve(addToolApprovalResponse({ id: approvalId, approved: true }))
                .then(() => setHandled(true))
                .catch(() => {
                    autoApprovedRef.current = false;
                });
        }
    }, [addToolApprovalResponse, approvalId, autoApprove, handled]);

    const handleApprove = () => {
        Promise.resolve(addToolApprovalResponse({ id: approvalId, approved: true }))
            .then(() => setHandled(true))
            .catch(() => {
                setHandled(false);
            });
    };

    const handleReject = () => {
        Promise.resolve(addToolApprovalResponse({ id: approvalId, approved: false }))
            .then(() => setHandled(true))
            .catch(() => {
                setHandled(false);
            });
    };

    return (
        <ToolCardFrame
            tone="warning"
            statusLabel="Pending action"
            toolName={toolName}
            payload={input}
            mode="input"
        >
            {handled || autoApprovedRef.current ? (
                <div className="text-xs font-medium text-green-700">
                    {autoApprove ? 'Auto-accepted' : 'Accepted'}
                </div>
            ) : (
                <div className="flex gap-2">
                    <button
                        type="button"
                        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                        onClick={handleApprove}
                    >
                        Accept
                    </button>
                    <button
                        type="button"
                        className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                        onClick={handleReject}
                    >
                        Reject
                    </button>
                </div>
            )}
        </ToolCardFrame>
    );
}

const THINKING_PHASES = [
    'Thinking...',
    'Working on it...',
    'Running tools...',
    'Still processing...',
    'Crunching data...',
    'Almost there...',
];

function ThinkingIndicator() {
    const [elapsed, setElapsed] = useState(0);
    const [phaseIndex, setPhaseIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (elapsed > 0 && elapsed % 6 === 0) {
            setPhaseIndex((i) => Math.min(i + 1, THINKING_PHASES.length - 1));
        }
    }, [elapsed]);

    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="text-left">
            <div className="inline-flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 shadow-sm">
                <span className="flex gap-[3px]">
                    <span className="inline-block h-[6px] w-[6px] animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                    <span className="inline-block h-[6px] w-[6px] animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                    <span className="inline-block h-[6px] w-[6px] animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                </span>
                <span>{THINKING_PHASES[phaseIndex]}</span>
                <span className="tabular-nums text-xs text-gray-400">{formatTime(elapsed)}</span>
            </div>
        </div>
    );
}

function MessageList({
    messages,
    autoApprove,
    addToolApprovalResponse,
}: {
    messages: UIMessage[];
    autoApprove: boolean;
    addToolApprovalResponse: (response: { id: string; approved: boolean; reason?: string }) => void | PromiseLike<void>;
}) {
    return (
        <>
            {messages.map((message) => {
                const textContent = getMessageText(message);
                const toolParts = getToolParts(message);
                const shouldRenderToolsFirst = message.role === 'assistant' && toolParts.length > 0;

                return (
                    <div key={message.id} className="space-y-2">
                        {(shouldRenderToolsFirst ? toolParts : []).map((part) => {
                            const toolName = part.type.replace(/^tool-/, '');

                            if (part.state === 'approval-requested' && part.approval?.id) {
                                return (
                                    <ToolApprovalCard
                                        key={part.toolCallId || `${message.id}-${toolName}`}
                                        toolName={toolName}
                                        input={part.input}
                                        approvalId={part.approval.id}
                                        autoApprove={autoApprove}
                                        addToolApprovalResponse={addToolApprovalResponse}
                                    />
                                );
                            }

                            if (part.state === 'output-available') {
                                return (
                                    <ToolResultCard
                                        key={part.toolCallId || `${message.id}-${toolName}`}
                                        toolName={toolName}
                                        output={part.output}
                                    />
                                );
                            }

                            if (part.state === 'output-error') {
                                return (
                                    <ToolResultCard
                                        key={part.toolCallId || `${message.id}-${toolName}`}
                                        toolName={toolName}
                                        errorText={part.errorText || 'Tool execution failed'}
                                    />
                                );
                            }

                            if (part.state === 'input-available' || part.state === 'input-streaming') {
                                return (
                                    <ToolCardFrame
                                        key={part.toolCallId || `${message.id}-${toolName}`}
                                        tone="neutral"
                                        statusLabel="Preparing action"
                                        toolName={toolName}
                                        payload={part.input}
                                        mode="input"
                                    />
                                );
                            }

                            return null;
                        })}

                        {textContent && (
                            <div className={message.role === 'user' ? 'text-right' : 'text-left'}>
                                <div
                                    className={`inline-block max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                        message.role === 'user'
                                            ? 'bg-primary text-white'
                                            : 'border border-gray-200 bg-gray-50 text-gray-900'
                                    }`}
                                >
                                    <pre className="whitespace-pre-wrap break-words font-sans">
                                        {textContent}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {(!shouldRenderToolsFirst ? toolParts : []).map((part) => {
                            const toolName = part.type.replace(/^tool-/, '');

                            if (part.state === 'approval-requested' && part.approval?.id) {
                                return (
                                    <ToolApprovalCard
                                        key={part.toolCallId || `${message.id}-${toolName}`}
                                        toolName={toolName}
                                        input={part.input}
                                        approvalId={part.approval.id}
                                        autoApprove={autoApprove}
                                        addToolApprovalResponse={addToolApprovalResponse}
                                    />
                                );
                            }

                            if (part.state === 'output-available') {
                                return (
                                    <ToolResultCard
                                        key={part.toolCallId || `${message.id}-${toolName}`}
                                        toolName={toolName}
                                        output={part.output}
                                    />
                                );
                            }

                            if (part.state === 'output-error') {
                                return (
                                    <ToolResultCard
                                        key={part.toolCallId || `${message.id}-${toolName}`}
                                        toolName={toolName}
                                        errorText={part.errorText || 'Tool execution failed'}
                                    />
                                );
                            }

                            if (part.state === 'input-available' || part.state === 'input-streaming') {
                                return (
                                    <ToolCardFrame
                                        key={part.toolCallId || `${message.id}-${toolName}`}
                                        tone="neutral"
                                        statusLabel="Preparing action"
                                        toolName={toolName}
                                        payload={part.input}
                                        mode="input"
                                    />
                                );
                            }

                            return null;
                        })}
                    </div>
                );
            })}
        </>
    );
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const shortcutLabel = isMac ? '⌘K' : 'Ctrl+K';

function ChatConversation({
    sessionId,
    initialMessages,
    pathname,
    token,
    autoApprove,
    onSessionUpdated,
}: {
    sessionId: string;
    initialMessages: UIMessage[];
    pathname: string | null;
    token: string;
    autoApprove: boolean;
    onSessionUpdated: () => void;
}) {
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const shouldAutoScrollRef = useRef(true);

    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: '/api/ai-chat',
                body: {
                    token,
                    pageUrl: pathname ?? undefined,
                },
            }),
        [pathname, token]
    );

    const {
        messages,
        sendMessage,
        status,
        error,
        addToolApprovalResponse,
    } = useChat({
        id: sessionId,
        messages: initialMessages,
        transport,
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
        onFinish: () => {
            onSessionUpdated();
        },
    });

    const isBusy = status === 'submitted' || status === 'streaming';

    const updateAutoScrollState = () => {
        const container = scrollContainerRef.current;
        if (!container) {
            return;
        }

        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        shouldAutoScrollRef.current = distanceFromBottom < 96;
    };

    useEffect(() => {
        if (!shouldAutoScrollRef.current) {
            return;
        }

        messagesEndRef.current?.scrollIntoView({
            behavior: isBusy ? 'auto' : 'smooth',
        });
    }, [messages, isBusy]);

    useEffect(() => {
        window.setTimeout(() => inputRef.current?.focus(), 100);
    }, [sessionId]);

    useEffect(() => {
        shouldAutoScrollRef.current = true;
    }, [sessionId]);

    const handleSend = () => {
        const text = input.trim();
        if (!text || isBusy) {
            return;
        }

        void sendMessage({ text });
        setInput('');
    };

    return (
        <>
            <div
                ref={scrollContainerRef}
                className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-4"
                onScroll={updateAutoScrollState}
            >
                <div className="space-y-3">
                    {messages.length === 0 && !isBusy && (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                            Start a chat to ask questions, inspect decks, or have the assistant prepare changes for approval.
                        </div>
                    )}

                    <MessageList
                        messages={messages}
                        autoApprove={autoApprove}
                        addToolApprovalResponse={addToolApprovalResponse}
                    />

                    {isBusy && <ThinkingIndicator />}

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            Error: {error.message || 'Something went wrong'}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="border-t border-gray-200 bg-white px-4 py-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-2 shadow-sm">
                    <textarea
                        ref={inputRef}
                        className="min-h-[88px] w-full resize-none bg-transparent px-2 py-2 text-sm text-gray-900 outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        rows={4}
                        placeholder={isBusy ? 'Agent is working...' : 'Ask about your decks or request changes...'}
                        value={input}
                        disabled={isBusy}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-2 pt-2">
                        <div className="text-xs text-gray-400">
                            Enter to send, Shift+Enter for a new line
                        </div>
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={isBusy || !input.trim()}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default function AIChatWidget() {
    const { token, isAuthInitializing } = useAuth();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [autoApprove, setAutoApprove] = useState(false);
    const [showSessionPicker, setShowSessionPicker] = useState(false);

    const createSession = useCreateAIChatSessionMutation();
    const queryClient = useQueryClient();
    const {
        data: sessions,
        refetch: refetchSessions,
        isError: sessionsError,
        isPending: sessionsLoading,
    } = useAIChatSessions();
    const sessionMessagesQuery = useAIChatMessages(sessionId || undefined);

    const activeSession = useMemo(
        () => sessions?.find((session) => session.id === sessionId) ?? null,
        [sessionId, sessions]
    );

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                setIsOpen((prev) => !prev);
                setShowSessionPicker(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (!isOpen || !token || sessionId || createSession.isPending) {
            return;
        }

        if (sessionsLoading) {
            return;
        }

        if (sessions && sessions.length > 0) {
            setSessionId(sessions[0].id);
            return;
        }

        if ((sessions && sessions.length === 0) || sessionsError) {
            createSession.mutate(undefined, {
                onSuccess: (data) => {
                    setSessionId(data.id);
                    refetchSessions();
                },
            });
        }
    }, [createSession, isOpen, refetchSessions, sessionId, sessions, sessionsError, sessionsLoading, token]);

    const handleNewChat = () => {
        createSession.mutate(undefined, {
            onSuccess: (data) => {
                setSessionId(data.id);
                setShowSessionPicker(false);
                refetchSessions();
            },
        });
    };

    const handleSelectSession = (id: string) => {
        setSessionId(id);
        setShowSessionPicker(false);
    };

    const refreshChatState = () => {
        void refetchSessions();
        void queryClient.invalidateQueries({ queryKey: aiChatKeys.messages(sessionId || undefined) });
    };

    if (isAuthInitializing || !token) {
        return null;
    }

    return (
        <>
            {!isOpen && (
                <div className="fixed bottom-4 right-4 z-40">
                    <button
                        type="button"
                        onClick={() => setIsOpen(true)}
                        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-medium text-gray-700 shadow-lg transition hover:border-primary hover:text-primary"
                        aria-label={`Open AI sidebar (${shortcutLabel})`}
                        title={`Open AI sidebar (${shortcutLabel})`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-primary">
                            <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                        </svg>
                        <span>AI</span>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                            {shortcutLabel}
                        </span>
                    </button>
                </div>
            )}

            {isOpen && (
                <>
                    <button
                        type="button"
                        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] lg:hidden"
                        aria-label="Close AI sidebar overlay"
                        onClick={() => {
                            setIsOpen(false);
                            setShowSessionPicker(false);
                        }}
                    />
                    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-gray-200 bg-white shadow-2xl">
                        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                            <div className="flex items-start gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                                <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-gray-900">
                                                {activeSession?.title || 'AI assistant'}
                                            </div>
                                            <div className="text-[11px] text-gray-500">
                                                Ask questions, inspect decks, or run edits
                                            </div>
                                        </div>
                                    </div>
                                    {pathname && (
                                        <div className="mt-2 truncate text-[11px] text-gray-400" title={pathname}>
                                            Context: {pathname}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        setShowSessionPicker(false);
                                    }}
                                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                                    aria-label="Close AI sidebar"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                                <div className="relative flex-1">
                                    <button
                                        type="button"
                                        className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-700 hover:border-gray-300"
                                        onClick={() => setShowSessionPicker((prev) => !prev)}
                                    >
                                        <span className="truncate">{activeSession?.title || 'Select a chat'}</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-gray-400">
                                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    {showSessionPicker && (
                                        <div className="absolute left-0 right-0 top-full mt-2 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                                            <button
                                                type="button"
                                                className="mb-2 w-full rounded-lg bg-primary px-3 py-2 text-left text-sm font-medium text-white hover:bg-red-700"
                                                onClick={handleNewChat}
                                            >
                                                + New chat
                                            </button>
                                            {sessions?.length ? (
                                                <div className="space-y-1">
                                                    {sessions.map((session) => (
                                                        <button
                                                            key={session.id}
                                                            type="button"
                                                            className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                                                                session.id === sessionId
                                                                    ? 'bg-primary/10 text-primary'
                                                                    : 'text-gray-700 hover:bg-gray-50'
                                                            }`}
                                                            onClick={() => handleSelectSession(session.id)}
                                                        >
                                                            <div className="truncate font-medium">
                                                                {session.title || 'Untitled chat'}
                                                            </div>
                                                            <div className="mt-0.5 text-[11px] text-gray-400">
                                                                {formatSessionTime(session.updatedAt)}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="px-2 py-4 text-center text-sm text-gray-400">
                                                    No chats yet.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                                    <input
                                        type="checkbox"
                                        className="accent-primary"
                                        checked={autoApprove}
                                        onChange={(event) => setAutoApprove(event.target.checked)}
                                    />
                                    Auto-accept
                                </label>
                            </div>
                        </div>

                        {!sessionId && !createSession.isError && (
                            <div className="flex min-h-0 flex-1 items-center justify-center px-4">
                                <div className="w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                                    Starting chat...
                                </div>
                            </div>
                        )}

                        {!sessionId && createSession.isError && (
                            <div className="flex min-h-0 flex-1 items-center justify-center px-4">
                                <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
                                    <div className="font-medium">Failed to start chat</div>
                                    <div className="mt-1 text-xs text-red-500">
                                        {createSession.error?.message || 'Could not connect. Check that the server is running.'}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => createSession.mutate(undefined, {
                                            onSuccess: (data) => {
                                                setSessionId(data.id);
                                                refetchSessions();
                                            },
                                        })}
                                        className="mt-3 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        )}

                        {sessionId && sessionMessagesQuery.isPending && (
                            <div className="flex min-h-0 flex-1 items-center justify-center px-4">
                                <div className="w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                                    Loading chat...
                                </div>
                            </div>
                        )}

                        {sessionId && sessionMessagesQuery.isError && (
                            <div className="flex min-h-0 flex-1 items-center justify-center px-4">
                                <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
                                    Failed to load chat: {sessionMessagesQuery.error.message}
                                </div>
                            </div>
                        )}

                        {sessionId && sessionMessagesQuery.data && (
                            <ChatConversation
                                key={sessionId}
                                sessionId={sessionId}
                                initialMessages={sessionMessagesQuery.data}
                                pathname={pathname}
                                token={token}
                                autoApprove={autoApprove}
                                onSessionUpdated={refreshChatState}
                            />
                        )}
                    </aside>
                </>
            )}
        </>
    );
}
