'use client';

import React from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import { submitSpeedReadingAttemptAction } from '@/actions/speedReading';

function cleanText(raw: string): string {
    if (!raw) return '';
    // Normalize newlines and trim whitespace lines
    let t = raw.replace(/\r\n?/g, '\n');
    // Collapse multiple spaces
    t = t.replace(/[\t ]+/g, ' ');
    // Trim each line
    t = t
        .split('\n')
        .map((l) => l.trim())
        .join('\n');
    // Collapse 3+ newlines to 2 to keep paragraphs
    t = t.replace(/\n{3,}/g, '\n\n');
    // Trim overall
    return t.trim();
}

export default function SpeedReadingPage() {
    const [input, setInput] = React.useState('');
    const [wpm, setWpm] = React.useState(300);
    const [phase, setPhase] = React.useState<'setup' | 'running' | 'finished'>('setup');
    const [cleaned, setCleaned] = React.useState('');
    const [attemptId, setAttemptId] = React.useState<string | null>(null);
    const [rating, setRating] = React.useState(7);

    const previewWords = React.useMemo(() => (input ? input.trim().split(/\s+/).filter(Boolean).length : 0), [input]);
    const startDelayMs = 2000; // 2s buffer before countdown starts
    const previewIntervalMs = React.useMemo(() => (wpm > 0 ? 60000 / wpm : 0), [wpm]);
    const previewDurationSec = React.useMemo(() => {
        if (previewWords === 0 || previewIntervalMs <= 0) return 0;
        const fadeMs = 250;
        const total = startDelayMs + Math.max(0, previewWords - 1) * previewIntervalMs + fadeMs;
        return Math.round(total / 1000);
    }, [previewWords, previewIntervalMs]);

    const finishTimerRef = React.useRef<number | null>(null);

    const tokens = React.useMemo(() => {
        if (!cleaned) return [] as { text: string; isWord: boolean }[];
        // Split into sequences of non-space and spaces, preserving everything
        const parts = cleaned.split(/(\s+)/);
        return parts.map((p) => ({ text: p, isWord: !/^\s+$/.test(p) }));
    }, [cleaned]);

    const totalWords = React.useMemo(() => tokens.filter(t => t.isWord).length, [tokens]);
    const intervalMs = React.useMemo(() => (wpm > 0 ? 60000 / wpm : 0), [wpm]);
    const fadeMs = 250; // duration of individual word fade
    const durationMs = React.useMemo(() => {
        if (totalWords === 0 || intervalMs <= 0) return 0;
        return Math.round(startDelayMs + (Math.max(0, totalWords - 1) * intervalMs) + fadeMs);
    }, [totalWords, intervalMs]);

    const handleStart = () => {
        const c = cleanText(input);
        if (!c) {
            alert('Please paste some text first.');
            return;
        }
        setCleaned(c);
        setPhase('running');
        // Clear any prior timer
        if (finishTimerRef.current) {
            window.clearTimeout(finishTimerRef.current);
            finishTimerRef.current = null;
        }
        // Compute local duration based on this exact text and current WPM
        const localWordCount = (c.match(/\S+/g) || []).length;
        const localInterval = wpm > 0 ? 60000 / wpm : 0;
        const localFade = fadeMs;
        let localDuration = 0;
        if (localWordCount > 0 && localInterval > 0) {
            localDuration = Math.round(startDelayMs + Math.max(0, localWordCount - 1) * localInterval + localFade);
        } else {
            localDuration = startDelayMs + 1000; // fallback
        }
        // One timer for completion
        finishTimerRef.current = window.setTimeout(() => {
            setPhase('finished');
        }, localDuration) as unknown as number;
    };

    React.useEffect(() => () => {
        // Cleanup timer on unmount
        if (finishTimerRef.current) {
            window.clearTimeout(finishTimerRef.current);
        }
    }, []);

    const handleSubmitRating = async () => {
        if (!cleaned || durationMs <= 0) return;
        try {
            const res = await submitSpeedReadingAttemptAction({
                text: cleaned,
                wpm: Math.max(50, Math.min(2000, Math.round(wpm))),
                durationMs,
                rating: Math.max(1, Math.min(10, Math.round(rating))),
            });
            if (res.success) {
                setAttemptId(res.id);
                alert('Saved! Thanks for the feedback.');
            } else {
                alert(res.message || 'Failed to save.');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to save result.');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800">Speed Reading</h1>
                <Link href="/" className="text-primary underline hover:text-red-700">Home</Link>
            </div>

            {phase === 'setup' && (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="sr-input" className="block text-sm font-medium text-gray-700 mb-2">Paste your text</label>
                        <textarea
                            id="sr-input"
                            className="w-full h-56 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary font-mono text-sm"
                            placeholder="Paste a passage or article here..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">We’ll lightly clean whitespace and blank lines.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <label htmlFor="sr-wpm" className="text-sm font-medium text-gray-700">Speed (WPM):</label>
                        <input
                            id="sr-wpm"
                            type="number"
                            min={50}
                            max={2000}
                            step={10}
                            value={wpm}
                            onChange={(e) => setWpm(Number(e.target.value) || 0)}
                            className="w-28 px-2 py-1 border border-gray-300 rounded"
                        />
                    </div>
                    <div className="flex gap-3">
                        <Button variant="primary" onClick={handleStart} disabled={!input.trim()}>Start</Button>
                        <span className="self-center text-sm text-gray-600">Words: {previewWords} • Est. time: {previewDurationSec}s</span>
                    </div>
                </div>
            )}

            {phase === 'running' && (
                <div className="space-y-4">
                    <div className="text-sm text-gray-600">WPM: {wpm} • Words: {totalWords} • Duration: {Math.round(durationMs / 1000)}s (includes 2s start buffer)</div>
                    <div className="relative bg-white border border-gray-200 rounded-md shadow-md p-6 overflow-hidden">
                        <div className={`text-gray-900 leading-relaxed whitespace-pre-wrap ${phase === 'running' ? 'sr-running' : ''}`}>
                            {(() => {
                                let wordIndex = 0;
                                return tokens.map((t, i) => {
                                    if (!t.isWord) {
                                        return <span key={i}>{t.text}</span>;
                                    }
                                    const idx = wordIndex++;
                                    const delay = Math.round(startDelayMs + idx * intervalMs);
                                    return (
                                        <span
                                            key={i}
                                            className="sr-word"
                                            style={{ animationDelay: `${delay}ms`, animationDuration: `${fadeMs}ms` }}
                                        >
                                            {t.text}
                                        </span>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                    <p className="text-sm text-gray-500">Words fade to white one-by-one at the chosen speed.</p>
                </div>
            )}

            {phase === 'finished' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                        <h2 className="text-xl font-semibold mb-4">How much did you understand?</h2>
                        <div className="flex items-center gap-4 mb-2">
                            <span className="text-sm text-gray-600">1</span>
                            <input
                                type="range"
                                min={1}
                                max={10}
                                value={rating}
                                onChange={(e) => setRating(Number(e.target.value))}
                                className="flex-1"
                            />
                            <span className="text-sm text-gray-600">10</span>
                        </div>
                        <div className="text-sm text-gray-700 mb-4">Your rating: <span className="font-semibold">{rating}</span></div>
                        <div className="flex gap-3">
                            <Button variant="primary" onClick={handleSubmitRating}>Submit</Button>
                            <Button variant="default" onClick={() => { 
                                if (finishTimerRef.current) { window.clearTimeout(finishTimerRef.current); finishTimerRef.current = null; }
                                setPhase('setup'); setInput(''); setCleaned(''); setAttemptId(null); 
                            }}>Start Over</Button>
                        </div>
                    </div>
                    {attemptId && (
                        <div className="text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded">
                            Saved result (id: {attemptId}).
                        </div>
                    )}
                </div>
            )}

            {/* Minimal component-scoped styles for per-word fade */}
            <style jsx>{`
                .sr-word {
                    display: inline;
                    animation-name: srFadeToWhite;
                    animation-timing-function: linear;
                    animation-fill-mode: forwards;
                    animation-play-state: paused;
                    will-change: color, opacity;
                }
                .sr-running .sr-word {
                    animation-play-state: running;
                }
                @keyframes srFadeToWhite {
                    to { color: white; opacity: 0; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .sr-word { animation-duration: 1ms !important; animation-delay: 0ms !important; }
                }
            `}</style>
        </div>
    );
}
