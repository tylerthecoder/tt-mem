import React from 'react';
import { Link } from 'react-router-dom';

// TODO: Define or import Deck type
interface MockDeck {
    id: string;
    name: string;
}

const mockDecks: MockDeck[] = [
    { id: '1', name: 'React Basics' },
    { id: '2', name: 'TypeScript Fundamentals' },
    { id: '3', name: 'CSS Grids' },
];

// Define common button styles - adjust as needed
const buttonBase = "px-3 py-1 rounded text-sm transition-colors";
const playButtonClass = `${buttonBase} bg-secondary text-white hover:bg-green-700`; // Use secondary green
const editButtonClass = `${buttonBase} bg-gray-500 text-white hover:bg-gray-600`;

const HomePage: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-primary">My Decks</h1>
            {/* TODO: Add a button/link to create a new deck */}
            <ul className="space-y-3">
                {mockDecks.map(deck => (
                    <li
                        key={deck.id}
                        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded shadow"
                    >
                        <span className="font-medium text-lg">{deck.name}</span>
                        <div className="space-x-2">
                            {/* Links to Play and Edit pages, styled as buttons */}
                            <Link to={`/deck/${deck.id}/play`} className={playButtonClass}>Play</Link>
                            <Link to={`/deck/${deck.id}/edit`} className={editButtonClass}>Edit</Link>
                            {/* TODO: Add a delete button - maybe use primary red style */}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default HomePage;