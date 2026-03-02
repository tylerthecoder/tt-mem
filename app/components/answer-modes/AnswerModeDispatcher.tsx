'use client';

import React from 'react';
import type { Card } from '@/types';
import { AnswerMode, ReviewResult } from '@/types';
import FlipAnswer from './FlipAnswer';
import TypeInAnswer from './TypeInAnswer';
import MultipleChoiceAnswer from './MultipleChoiceAnswer';
import MapSelectAnswer from './MapSelectAnswer';

export interface AnswerData {
    result?: ReviewResult;
    is_correct?: boolean;
    user_answer?: string;
}

interface AnswerModeDispatcherProps {
    card: Card;
    onAnswer: (data: AnswerData) => void;
    isPending: boolean;
}

export default function AnswerModeDispatcher({ card, onAnswer, isPending }: AnswerModeDispatcherProps) {
    const mode = card.answer_mode ?? AnswerMode.FLIP;

    switch (mode) {
        case AnswerMode.FLIP:
            return (
                <FlipAnswer
                    card={card}
                    onAnswer={(data) => onAnswer({ result: data.result })}
                    isPending={isPending}
                />
            );

        case AnswerMode.TYPE_IN:
            return (
                <TypeInAnswer
                    card={card}
                    onAnswer={(data) => onAnswer({ is_correct: data.is_correct, user_answer: data.user_answer })}
                    isPending={isPending}
                />
            );

        case AnswerMode.MULTIPLE_CHOICE:
            return (
                <MultipleChoiceAnswer
                    card={card}
                    onAnswer={(data) => onAnswer({ is_correct: data.is_correct, user_answer: data.user_answer })}
                    isPending={isPending}
                />
            );

        case AnswerMode.MAP_SELECT:
            return (
                <MapSelectAnswer
                    card={card}
                    onAnswer={(data) => onAnswer({ is_correct: data.is_correct, user_answer: data.user_answer })}
                    isPending={isPending}
                />
            );

        default:
            return (
                <FlipAnswer
                    card={card}
                    onAnswer={(data) => onAnswer({ result: data.result })}
                    isPending={isPending}
                />
            );
    }
}
