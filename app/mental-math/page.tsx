'use client';

import React from 'react';
import PageHeader from '@/components/PageHeader';

type Operation = '+' | '−' | '×' | '÷';

interface Problem {
    a: number;
    b: number;
    op: Operation;
    answer: number;
    display: string;
}

interface DifficultyConfig {
    label: string;
    description: string;
    ranges: Record<Operation, { aMin: number; aMax: number; bMin: number; bMax: number }>;
}

const OPERATIONS: { op: Operation; label: string }[] = [
    { op: '+', label: 'Add (+)' },
    { op: '−', label: 'Subtract (−)' },
    { op: '×', label: 'Multiply (×)' },
    { op: '÷', label: 'Divide (÷)' },
];

const DIFFICULTIES: Record<string, DifficultyConfig> = {
    easy: {
        label: 'Easy',
        description: 'Single digits',
        ranges: {
            '+': { aMin: 1, aMax: 20, bMin: 1, bMax: 20 },
            '−': { aMin: 1, aMax: 20, bMin: 1, bMax: 20 },
            '×': { aMin: 2, aMax: 9, bMin: 2, bMax: 9 },
            '÷': { aMin: 2, aMax: 9, bMin: 2, bMax: 9 },
        },
    },
    medium: {
        label: 'Medium',
        description: 'Two digits',
        ranges: {
            '+': { aMin: 10, aMax: 99, bMin: 10, bMax: 99 },
            '−': { aMin: 10, aMax: 99, bMin: 10, bMax: 99 },
            '×': { aMin: 2, aMax: 12, bMin: 10, bMax: 99 },
            '÷': { aMin: 2, aMax: 12, bMin: 2, bMax: 12 },
        },
    },
    hard: {
        label: 'Hard',
        description: 'Three digits',
        ranges: {
            '+': { aMin: 100, aMax: 999, bMin: 10, bMax: 999 },
            '−': { aMin: 100, aMax: 999, bMin: 10, bMax: 999 },
            '×': { aMin: 10, aMax: 99, bMin: 10, bMax: 99 },
            '÷': { aMin: 2, aMax: 20, bMin: 2, bMax: 20 },
        },
    },
};

function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateProblem(ops: Operation[], difficulty: string): Problem {
    const op = ops[Math.floor(Math.random() * ops.length)];
    const config = DIFFICULTIES[difficulty].ranges[op];

    let a: number, b: number, answer: number;

    switch (op) {
        case '+':
            a = randInt(config.aMin, config.aMax);
            b = randInt(config.bMin, config.bMax);
            answer = a + b;
            break;
        case '−':
            a = randInt(config.aMin, config.aMax);
            b = randInt(config.bMin, Math.min(config.bMax, a));
            answer = a - b;
            break;
        case '×':
            a = randInt(config.aMin, config.aMax);
            b = randInt(config.bMin, config.bMax);
            answer = a * b;
            break;
        case '÷':
            b = randInt(config.bMin, config.bMax);
            answer = randInt(config.aMin, config.aMax);
            a = b * answer;
            break;
        default:
            a = 0; b = 0; answer = 0;
    }

    return { a, b, op, answer, display: `${a} ${op} ${b}` };
}

type Phase = 'setup' | 'playing' | 'result';

interface SessionStats {
    correct: number;
    total: number;
    streak: number;
    bestStreak: number;
    history: { problem: Problem; userAnswer: number; correct: boolean; timeMs: number }[];
}

export default function MentalMathPage() {
    const [enabledOps, setEnabledOps] = React.useState<Operation[]>(['+', '−', '×']);
    const [difficulty, setDifficulty] = React.useState('easy');
    const [phase, setPhase] = React.useState<Phase>('setup');
    const [problem, setProblem] = React.useState<Problem | null>(null);
    const [input, setInput] = React.useState('');
    const [feedback, setFeedback] = React.useState<{ correct: boolean; answer: number } | null>(null);
    const [stats, setStats] = React.useState<SessionStats>({
        correct: 0, total: 0, streak: 0, bestStreak: 0, history: [],
    });
    const [sessionTimer, setSessionTimer] = React.useState(0);
    const [problemStart, setProblemStart] = React.useState(0);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

    const startSession = React.useCallback(() => {
        const p = generateProblem(enabledOps, difficulty);
        setProblem(p);
        setInput('');
        setFeedback(null);
        setStats({ correct: 0, total: 0, streak: 0, bestStreak: 0, history: [] });
        setSessionTimer(0);
        setProblemStart(Date.now());
        setPhase('playing');
        timerRef.current = setInterval(() => setSessionTimer(t => t + 1), 1000);
    }, [enabledOps, difficulty]);

    const endSession = React.useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setPhase('result');
    }, []);

    React.useEffect(() => {
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    React.useEffect(() => {
        if (phase === 'playing' && !feedback) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [phase, feedback, problem]);

    const nextProblem = React.useCallback(() => {
        const p = generateProblem(enabledOps, difficulty);
        setProblem(p);
        setInput('');
        setFeedback(null);
        setProblemStart(Date.now());
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [enabledOps, difficulty]);

    const submitAnswer = React.useCallback(() => {
        if (!problem || input.trim() === '') return;
        const userAnswer = parseFloat(input.trim());
        if (isNaN(userAnswer)) return;
        const isCorrect = userAnswer === problem.answer;
        const timeMs = Date.now() - problemStart;

        setStats(prev => {
            const newStreak = isCorrect ? prev.streak + 1 : 0;
            return {
                correct: prev.correct + (isCorrect ? 1 : 0),
                total: prev.total + 1,
                streak: newStreak,
                bestStreak: Math.max(prev.bestStreak, newStreak),
                history: [...prev.history, { problem, userAnswer, correct: isCorrect, timeMs }],
            };
        });

        setFeedback({ correct: isCorrect, answer: problem.answer });
    }, [problem, input, problemStart]);

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (feedback) {
                nextProblem();
            } else {
                submitAnswer();
            }
        }
    }, [feedback, nextProblem, submitAnswer]);

    const toggleOp = (op: Operation) => {
        setEnabledOps(prev => {
            const has = prev.includes(op);
            if (has && prev.length > 1) return prev.filter(o => o !== op);
            if (!has) return [...prev, op];
            return prev;
        });
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    const avgTime = stats.history.length > 0
        ? (stats.history.reduce((sum, h) => sum + h.timeMs, 0) / stats.history.length / 1000).toFixed(1)
        : '0.0';

    if (phase === 'setup') {
        return (
            <div className="space-y-6 max-w-2xl mx-auto">
                <PageHeader title="Mental Math" backHref="/" backLabel="Home" />

                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 space-y-5">
                    <div>
                        <div className="font-semibold mb-2">Operations</div>
                        <div className="flex flex-wrap gap-2">
                            {OPERATIONS.map(({ op, label }) => {
                                const active = enabledOps.includes(op);
                                return (
                                    <button
                                        key={op}
                                        onClick={() => toggleOp(op)}
                                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${active
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <div className="font-semibold mb-2">Difficulty</div>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(DIFFICULTIES).map(([key, cfg]) => (
                                <button
                                    key={key}
                                    onClick={() => setDifficulty(key)}
                                    className={`rounded-lg border p-3 text-left transition-colors ${difficulty === key
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                                    }`}
                                >
                                    <div className="font-medium text-sm">{cfg.label}</div>
                                    <div className={`text-xs mt-0.5 ${difficulty === key ? 'text-white/80' : 'text-gray-500'}`}>
                                        {cfg.description}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={startSession}
                        className="w-full py-3 rounded-lg bg-primary text-white font-semibold text-lg hover:bg-red-700 transition-colors"
                    >
                        Start
                    </button>
                </div>
            </div>
        );
    }

    if (phase === 'result') {
        const recentHistory = [...stats.history].reverse().slice(0, 20);
        return (
            <div className="space-y-6 max-w-2xl mx-auto">
                <PageHeader title="Session Complete" backHref="/" backLabel="Home" />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Score', value: `${stats.correct}/${stats.total}` },
                        { label: 'Accuracy', value: `${accuracy}%` },
                        { label: 'Best Streak', value: `${stats.bestStreak}` },
                        { label: 'Avg Time', value: `${avgTime}s` },
                    ].map(s => (
                        <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>

                {recentHistory.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                        <div className="font-semibold mb-3">Problem History</div>
                        <div className="space-y-1 max-h-80 overflow-y-auto">
                            {recentHistory.map((h, i) => (
                                <div key={i} className={`flex items-center justify-between px-3 py-2 rounded text-sm ${h.correct ? 'bg-green-50' : 'bg-red-50'}`}>
                                    <span className="font-mono">{h.problem.display} = {h.correct ? h.userAnswer : <><s className="text-red-600">{h.userAnswer}</s> <span className="text-green-700 font-semibold">{h.problem.answer}</span></>}</span>
                                    <span className="text-gray-500 text-xs">{(h.timeMs / 1000).toFixed(1)}s</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={() => setPhase('setup')}
                        className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        Settings
                    </button>
                    <button
                        onClick={startSession}
                        className="flex-1 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-red-700 transition-colors"
                    >
                        Play Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-2xl mx-auto">
            <PageHeader
                title="Mental Math"
                backHref="/"
                backLabel="Home"
                actions={
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="font-mono">{formatTime(sessionTimer)}</span>
                        <span>{stats.correct}/{stats.total}</span>
                        {stats.streak >= 2 && (
                            <span className="text-orange-500 font-semibold">{stats.streak} streak</span>
                        )}
                    </div>
                }
            />

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8">
                <div className="text-center space-y-6">
                    <div className="text-4xl sm:text-5xl font-bold font-mono tracking-wide text-gray-900">
                        {problem?.display}
                    </div>

                    <div className="max-w-xs mx-auto space-y-3">
                        <input
                            ref={inputRef}
                            type="text"
                            inputMode="numeric"
                            pattern="-?[0-9]*"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={!!feedback}
                            placeholder="Your answer"
                            autoComplete="off"
                            className={`w-full text-center text-2xl font-mono py-3 px-4 rounded-lg border-2 outline-none transition-colors ${
                                feedback === null
                                    ? 'border-gray-300 focus:border-primary'
                                    : feedback.correct
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-red-500 bg-red-50'
                            }`}
                        />

                        {feedback && (
                            <div className={`text-sm font-medium ${feedback.correct ? 'text-green-700' : 'text-red-700'}`}>
                                {feedback.correct
                                    ? 'Correct!'
                                    : `Incorrect — answer is ${feedback.answer}`
                                }
                            </div>
                        )}

                        {!feedback ? (
                            <button
                                onClick={submitAnswer}
                                className="w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-red-700 transition-colors"
                            >
                                Submit
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={nextProblem}
                                    className="flex-1 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-red-700 transition-colors"
                                >
                                    Next (Enter)
                                </button>
                                <button
                                    onClick={endSession}
                                    className="py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                >
                                    End
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
                {[
                    { label: 'Correct', value: stats.correct },
                    { label: 'Total', value: stats.total },
                    { label: 'Accuracy', value: `${accuracy}%` },
                    { label: 'Best Streak', value: stats.bestStreak },
                ].map(s => (
                    <div key={s.label} className="bg-white border border-gray-200 rounded-lg py-2 px-1">
                        <div className="text-lg font-bold text-gray-900">{s.value}</div>
                        <div className="text-xs text-gray-500">{s.label}</div>
                    </div>
                ))}
            </div>

            {stats.history.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                    <div className="text-sm font-semibold mb-2 text-gray-700">Recent</div>
                    <div className="flex flex-wrap gap-1.5">
                        {[...stats.history].reverse().slice(0, 12).map((h, i) => (
                            <span
                                key={i}
                                title={`${h.problem.display} = ${h.problem.answer} (you: ${h.userAnswer})`}
                                className={`inline-block px-2 py-1 rounded text-xs font-mono ${h.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                            >
                                {h.problem.display} = {h.userAnswer}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
