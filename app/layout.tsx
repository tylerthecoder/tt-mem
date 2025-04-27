"use client";
import { Inter } from "next/font/google";
import Link from "next/link"; // Use Next.js Link
import "./globals.css";
import { AppProviders } from "./providers";
import { useAuth } from './context/useAuth';

const inter = Inter({ subsets: ["latin"] });


// Header component to conditionally show login/logout
function AppHeader() {
    const { token, logout } = useAuth();

    return (
        <header className="bg-gray-100 p-4 shadow-md border-b border-gray-200">
            <nav className="container mx-auto flex justify-between items-center">
                <Link href="/" className="text-xl font-bold text-primary">
                    TT Mem
                </Link>
                <div>
                    {token ? (
                        <button
                            onClick={logout}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                            Logout
                        </button>
                    ) : (
                        <Link
                            href="/login"
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                            Login
                        </Link>
                    )}
                </div>
            </nav>
        </header>
    );
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-gray-50 text-gray-900`}>
                {/* Use AppProviders to wrap everything */}
                <AppProviders>
                    <AppHeader />
                    <main className="container mx-auto p-4 md:p-6">
                        {children}
                    </main>
                    <footer className="text-center text-gray-500 py-4 mt-8 border-t border-gray-200">
                        © {new Date().getFullYear()} TT Mem
                    </footer>
                </AppProviders>
            </body>
        </html>
    );
}