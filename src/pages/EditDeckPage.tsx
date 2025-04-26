import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDeckCards, useDeck } from '../hooks/queryHooks';
import Button from '../components/Button';

// Inline Card type needed because useDeckCards uses mock data / inline types
interface Card {
    id: string;
    front_text: string;
    back_text: string;
}

const EditDeckPage: React.FC = () => {
    const { deckId } = useParams<{ deckId: string }>();

    // Fetch deck details (for name)
    const { data: deck, isLoading: deckLoading, error: deckError } = useDeck(deckId);

    // Fetch cards (currently mock)
    const { data: cards, isLoading: cardsLoading, error: cardsError }: { data: Card[], isLoading: boolean, error: null } = useDeckCards(deckId);

    // TODO: Implement functions for adding, editing, deleting cards
    const handleAddCard = () => console.log('Add card clicked');
    const handleEditCard = (cardId: string) => console.log('Edit card:', cardId);
    const handleDeleteCard = (cardId: string) => console.log('Delete card:', cardId);

    // Combined loading state
    if (deckLoading || cardsLoading) return <div className="text-center text-gray-500 dark:text-gray-400">Loading deck details...</div>;

    // Combined error state
    if (deckError) return <div className="text-center text-red-500 dark:text-red-400">Error loading deck: {deckError.message}</div>;
    if (cardsError) return <div className="text-center text-red-500 dark:text-red-400">An error occurred loading cards.</div>; // Generic message for mock hook error

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-primary">Edit Deck: {deck?.name || deckId}</h1>
                <Link to={`/deck/${deckId}/play`}>
                    <Button variant="secondary">Play this Deck</Button>
                </Link>
            </div>
            <hr className="border-gray-300 dark:border-gray-700" />
            <Button onClick={handleAddCard} variant="primary">Add New Card</Button>
            <h2 className="text-2xl font-semibold">Cards in Deck</h2>
            {cards && cards.length > 0 ? (
                <ul className="space-y-4">
                    {cards.map(card => (
                        <li key={card.id} className="p-4 bg-white dark:bg-gray-800 rounded shadow space-y-2">
                            <div><strong className="font-medium">Front:</strong> {card.front_text}</div>
                            <div><strong className="font-medium">Back:</strong> {card.back_text}</div>
                            <div className="flex space-x-2 pt-2">
                                <Button onClick={() => handleEditCard(card.id)} variant="default" size="sm">Edit</Button>
                                <Button onClick={() => handleDeleteCard(card.id)} variant="primary" size="sm">Delete</Button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-gray-500 dark:text-gray-400">No cards in this deck yet.</p>
            )}
            {/* TODO: Add forms/modals for adding/editing cards */}
        </div>
    );
};

export default EditDeckPage;