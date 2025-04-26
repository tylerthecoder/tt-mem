import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Button from '../components/Button';
import { useDeckCards } from '../hooks/queryHooks'; // Import the query hook
// import { ReviewResult } from '../types'; // Use inline type due to import issues

// Inline types needed due to import issues / mock hook structure
interface Card { // Keep Card because useDeckCards returns it, even if mock
    id: string;
    front_text: string;
    back_text: string;
}

enum ReviewResult { // Define ReviewResult inline
    EASY = "easy",
    MEDIUM = "medium",
    HARD = "hard",
    MISSED = "missed",
}

const PlayDeckPage: React.FC = () => {
    const { deckId } = useParams<{ deckId: string }>();
    // Adjust type annotation based on mock hook's actual return { error: null }
    const { data: cards, isLoading, error }: { data: Card[], isLoading: boolean, error: null } = useDeckCards(deckId);

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

        // Need to ensure currentCardIndex is valid before accessing cards[currentCardIndex]
        const safeIndex = currentCardIndex % cards.length;

        console.log(`Card ${cards[safeIndex].id} reviewed as: ${result}`);
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
    // Since the mock hook always returns error: null, this block might not be hit
    // unless the real hook implementation changes.
    if (error) {
        // If error could potentially have a message in the future, type assertion might be needed
        // const errorMessage = (error as any)?.message || 'An unknown error occurred';
        // return <div className="text-center text-red-500 dark:text-red-400">Error loading deck: {errorMessage}</div>;

        // For now, just indicate a generic error state if error is somehow not null
        return <div className="text-center text-red-500 dark:text-red-400">An error occurred loading the deck.</div>;
    }

    // Ensure currentCardIndex is valid after potential data change
    // Check if cards is not empty before calculating safe index
    if (!cards || cards.length === 0) {
        // Render empty/loading state (already handled above)
        return <div className="text-center text-gray-500 dark:text-gray-400">Deck is empty or loading... <Link to={`/deck/${deckId}/edit`} className="text-primary underline">Add cards</Link></div>; // Adjusted message slightly
    }
    const safeCurrentCardIndex = currentCardIndex % cards.length;
    const currentCard = cards[safeCurrentCardIndex]; // Use safe index

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
                    {/* Ensure currentCard is defined before accessing properties */}
                    <p className="text-2xl font-medium mb-4 min-h-[3em]">{currentCard?.front_text}</p>
                    {showBack && (
                        <p className="text-xl text-secondary min-h-[2.5em]">{currentCard?.back_text}</p>
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