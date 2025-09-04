'use client';

import React from 'react';
import Link from 'next/link';
import Button from '@/components/Button';

type AppCard = {
    title: string;
    description: string;
    href: string;
    icon: string; // emoji for simplicity
};

const apps: AppCard[] = [
    { title: 'Decks', description: 'Create, review, and manage flashcards.', href: '/decks', icon: '🗂️' },
    { title: 'AI Chat', description: 'Ask questions and study with AI.', href: '/ai-chat', icon: '🤖' },
    { title: 'AI Quiz', description: 'Generate practice quizzes with AI.', href: '/quiz', icon: '📝' },
    { title: 'Reading Comp', description: 'Read and answer comprehension questions.', href: '/reading-comprehension', icon: '📖' },
    { title: 'Reading Speed', description: 'Practice speed reading and track comprehension.', href: '/speed-reading', icon: '⚡' },
    { title: 'Interval Training', description: 'Ear training: guess musical intervals.', href: '/interval-training', icon: '🎵' },
];

export default function HomePage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Learning Apps</h1>
                <p className="text-gray-600 mt-1">Launch a practice mode to start memorizing faster.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {apps.map((app) => (
                    <Link key={app.href} href={app.href} className="group block">
                        <div className="h-full bg-white border border-gray-200 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow flex items-start gap-4">
                            <div className="text-3xl" aria-hidden>{app.icon}</div>
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 group-hover:text-primary">{app.title}</div>
                                <div className="text-sm text-gray-600 mt-1 line-clamp-2">{app.description}</div>
                                <div className="mt-3">
                                    <span className="inline-block px-3 py-1 text-sm rounded bg-primary text-white">Open</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
