import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDeckCards } from '../hooks/queryHooks';

const EditDeckPage: React.FC = () => {
    const { deckId } = useParams<{ deckId: string }>();

    const { data: cards, isLoading, error } = useDeckCards(deckId);

    // TODO: Implement functions for adding, editing, deleting cards
    const handleAddCard = () => console.log('Add card clicked');
    const handleEditCard = (cardId: string) => console.log('Edit card:', cardId);
    const handleDeleteCard = (cardId: string) => console.log('Delete card:', cardId);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-primary">Edit Deck: {deckId}</h1> {/* Replace with actual deck name */}
                <Link to={`/deck/${deckId}/play`} className={secondaryButtonClass}>Play this Deck</Link>
            </div>
            <hr className="border-gray-300 dark:border-gray-700" />
            <button onClick={handleAddCard} className={primaryButtonClass}>Add New Card</button>
            <h2 className="text-2xl font-semibold">Cards in Deck</h2>
            <ul className="space-y-4">
                {cards.map(card => (
                    <li key={card.id} className="p-4 bg-white dark:bg-gray-800 rounded shadow space-y-2">
                        <div><strong className="font-medium">Front:</strong> {card.front_text}</div>
                        <div><strong className="font-medium">Back:</strong> {card.back_text}</div>
                        <div className="flex space-x-2 pt-2">
                            <button onClick={() => handleEditCard(card.id)} className={defaultButtonClass}>Edit</button>
                            <button onClick={() => handleDeleteCard(card.id)} className={primaryButtonClass}>Delete</button> {/* Use primary for delete */}
                        </div>
                    </li>
                ))}
            </ul>
            {/* TODO: Add forms/modals for adding/editing cards */}
        </div>
    );
};

export default EditDeckPage;