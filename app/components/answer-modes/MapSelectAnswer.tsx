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

    const handleSubmit = () => {
        if (!selectedCountry || !card.correct_country_code) return;
        setSubmitted(true);
    };

    const isCorrect = submitted && selectedCountry?.toUpperCase() === card.correct_country_code?.toUpperCase();

    const handleContinue = () => {
        if (!submitted || !selectedCountry) return;
        onAnswer({
            is_correct: isCorrect,
            user_answer: selectedCountry,
        });
    };

    return (
        <div className="space-y-4 pt-4 border-t border-gray-200">
            <WorldMap
                onCountryClick={handleCountryClick}
                selectedCountryCode={selectedCountry ?? undefined}
                correctCountryCode={card.correct_country_code}
                showFeedback={submitted}
                interactive={!submitted}
            />

            {selectedCountry && !submitted && (
                <div className="text-center space-y-2">
                    <p className="text-sm text-gray-600">
                        Selected: <span className="font-semibold">{selectedCountry}</span>
                    </p>
                    <Button onClick={handleSubmit} variant="secondary">
                        Confirm Selection
                    </Button>
                </div>
            )}

            {submitted && (
                <div className="space-y-3 text-center">
                    <p className={`text-lg font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        {isCorrect ? 'Correct!' : `Incorrect - the answer was ${card.correct_country_code}`}
                    </p>
                    {card.extra_context && (
                        <p className="text-sm text-gray-500 italic">{card.extra_context}</p>
                    )}
                    <Button onClick={handleContinue} variant="secondary" disabled={isPending}>
                        {isPending ? 'Recording...' : 'Continue'}
                    </Button>
                </div>
            )}
        </div>
    );
}
