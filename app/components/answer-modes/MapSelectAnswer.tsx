'use client';

import React, { useState, useEffect } from 'react';
import type { Card } from '@/types';
import Button from '@/components/Button';
import WorldMap from '@/components/map/WorldMap';

interface MapSelectAnswerProps {
    card: Card;
    onAnswer: (data: { is_correct: boolean; user_answer: string }) => void;
    isPending: boolean;
}

export default function MapSelectAnswer({ card, onAnswer, isPending }: MapSelectAnswerProps) {
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        setSelectedCountry(null);
        setSubmitted(false);
    }, [card.id]);

    const handleCountryClick = (countryCode: string) => {
        if (submitted) return;
        setSelectedCountry(countryCode);
    };

    const correctCountryCode = card.answer_content as string;

    const handleSubmit = () => {
        if (!selectedCountry || !correctCountryCode) return;
        setSubmitted(true);
    };

    const isCorrect = submitted && selectedCountry?.toUpperCase() === correctCountryCode?.toUpperCase();

    const handleContinue = () => {
        if (!submitted || !selectedCountry) return;
        onAnswer({
            is_correct: isCorrect,
            user_answer: selectedCountry,
        });
    };

    return (
        <div className="space-y-2 pt-3 border-t border-gray-100">
            <WorldMap
                onCountryClick={handleCountryClick}
                selectedCountryCode={selectedCountry ?? undefined}
                correctCountryCode={correctCountryCode}
                showFeedback={submitted}
                interactive={!submitted}
            />

            {selectedCountry && !submitted && (
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-600">
                        Selected: <span className="font-semibold">{selectedCountry}</span>
                    </p>
                    <Button onClick={handleSubmit} variant="secondary" size="sm">
                        Confirm
                    </Button>
                </div>
            )}

            {submitted && (
                <div className="flex items-center justify-between gap-3">
                    <div className="text-left">
                        <p className={`text-base font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                            {isCorrect ? 'Correct!' : `Incorrect — ${correctCountryCode}`}
                        </p>
                        {card.extra_context && (
                            <p className="text-xs text-gray-500 italic mt-0.5">{card.extra_context}</p>
                        )}
                    </div>
                    <Button onClick={handleContinue} variant="secondary" size="sm" disabled={isPending}>
                        {isPending ? 'Saving…' : 'Continue →'}
                    </Button>
                </div>
            )}
        </div>
    );
}
