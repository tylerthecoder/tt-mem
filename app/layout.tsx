import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link"; // Use Next.js Link
import "./globals.css";
import { AppProviders } from "./providers"; // Import the client providers component
// Import providers - adjust paths if needed after restructuring
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { AuthProvider } from '../context/AuthContext';

const inter = Inter({ subsets: ["latin"] });

// Note: QueryClient and AuthProvider setup needs client components.
// We'll create a separate client component for providers.

export const metadata: Metadata = {
    title: "Anki Clone",
    description: "Anki card studying website",
};

// Define the Navbar component separately for clarity
function Navbar() {
    // TODO: Add logic to show/hide Login based on auth state (from AuthContext)
    // TODO: Add Logout button
    return (
        <nav className="bg-primary text-white shadow-md">
            <ul className="container mx-auto px-4 py-3 flex space-x-4">
                <li>
                    <Link href="/" className="hover:text-gray-300">Home (Decks)</Link>
                </li>
                <li>
                    <Link href="/login" className="hover:text-gray-300">Login</Link>
                </li>
            </ul>
        </nav>
    );
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.className} min-h-screen flex flex-col`}>
                <AppProviders> { /* Wrap content with providers */}
                    <Navbar />
                    <main className="flex-grow container mx-auto px-4 py-8">
                        {children}
                    </main>
                    <footer className="bg-gray-200 dark:bg-gray-800 text-center py-4 mt-auto">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Anki Website Footer</p>
                    </footer>
                </AppProviders>
            </body>
        </html>
    );
}