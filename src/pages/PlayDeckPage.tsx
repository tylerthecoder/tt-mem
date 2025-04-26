import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Button from '../components/Button';
import { useDeckCards } from '../hooks/queryHooks'; // Import the query hook
import { ReviewResult } from '../../api/types'; // Update import path

const PlayDeckPage: React.FC = () => {
    const { deckId } = useParams<{ deckId: string }>();
    const { data: cards, isLoading, error } = useDeckCards(deckId);

    // Local state for UI interaction
    const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
    const [showBack, setShowBack] = useState<boolean>(false);

    // Reset card index and visibility when cards data changes (e.g., on initial load or refetch)
    useEffect(() => {
        if (cards && cards.length > 0) {
            setCurrentCardIndex(0);
            setShowBack(false);
        }
    }, [cards]);

    const handleShowAnswer = () => {
        setShowBack(true);
    };

    const handleReview = (result: ReviewResult) => {
        if (!cards || cards.length === 0) return; // Guard against no cards

        console.log(`Card ${cards[currentCardIndex].id} reviewed as: ${result}`);
        // TODO: Record the ReviewEvent (client-side and maybe send to server)
        // TODO: Implement logic to determine the *next* card based on SRS algorithm

        // Advance to the next card, wrapping around
        const nextIndex = (currentCardIndex + 1) % cards.length;
        setCurrentCardIndex(nextIndex);
        setShowBack(false); // Hide answer for the new card
    };

    // Handle Loading State
    if (isLoading) {
        return <div className="text-center text-gray-500 dark:text-gray-400">Loading deck...</div>;
    }

    // Handle Error State
    if (error) {
        return <div className="text-center text-red-500 dark:text-red-400">Error loading deck: {error.message}</div>;
    }

    // Handle Empty Deck State (after loading)
    if (!cards || cards.length === 0) {
        return <div className="text-center text-gray-500 dark:text-gray-400">Deck is empty. <Link to={`/deck/${deckId}/edit`} className="text-primary underline">Add cards</Link></div>;
    }

    // Ensure currentCardIndex is valid after potential data change
    const safeCurrentCardIndex = currentCardIndex % cards.length;
    const currentCard = cards[safeCurrentCardIndex];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-primary">Playing Deck: {deckId}</h1> {/* Replace with actual deck name */}
                <Link to={`/deck/${deckId}/edit`} className="px-4 py-2 rounded font-medium transition-colors text-white bg-gray-500 hover:bg-gray-600">Edit this Deck</Link>
            </div>
            <hr className="border-gray-300 dark:border-gray-700" />

            <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg text-center space-y-4 min-h-[250px] flex flex-col justify-between">
                {/* Card Content */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-4">
                        Card {safeCurrentCardIndex + 1} / {cards.length}
                    </h2>
                    <p className="text-2xl font-medium mb-4 min-h-[3em]">{currentCard.front_text}</p>
                    {showBack && (
                        <p className="text-xl text-secondary min-h-[2.5em]">{currentCard.back_text}</p>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    {showBack ? (
                        <div className="space-y-3">
                            <p className="font-medium">How well did you know it?</p>
                            <div className="flex justify-center space-x-2">
                                <Button onClick={() => handleReview(ReviewResult.EASY)} variant="easy" size="sm">Easy</Button>
                                <Button onClick={() => handleReview(ReviewResult.MEDIUM)} variant="medium" size="sm">Medium</Button>
                                <Button onClick={() => handleReview(ReviewResult.HARD)} variant="hard" size="sm">Hard</Button>
                                <Button onClick={() => handleReview(ReviewResult.MISSED)} variant="missed" size="sm">Missed</Button>
                            </div>
                        </div>
                    ) : (
                        <Button onClick={handleShowAnswer} variant="secondary">Show Answer</Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlayDeckPage;