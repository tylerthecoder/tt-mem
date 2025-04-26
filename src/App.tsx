// import './App.css';
import { Outlet, Link } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <nav className="bg-primary text-white shadow-md">
        <ul className="container mx-auto px-4 py-3 flex space-x-4">
          <li>
            <Link to="/" className="hover:text-gray-300">Home (Decks)</Link>
          </li>
          <li>
            <Link to="/login" className="hover:text-gray-300">Login</Link>
          </li>
        </ul>
      </nav>

      <main className="flex-grow container mx-auto px-4 py-8">
        <Outlet />
      </main>

      <footer className="bg-gray-200 dark:bg-gray-800 text-center py-4 mt-auto">
        <p className="text-sm text-gray-600 dark:text-gray-400">Anki Website Footer</p>
      </footer>
    </div>
  )
}

export default App
