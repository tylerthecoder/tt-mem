"use client";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { AppProviders } from "./providers";
import { useAuth } from './context/useAuth';
import AIChatWidget from './components/AIChatWidget';

const inter = Inter({ subsets: ["latin"] });


// Header component to conditionally show login/logout
function AppHeader() {
    const { token, logout } = useAuth();

    return (
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
            <nav className="container mx-auto flex h-12 items-center justify-between gap-3 px-4 md:px-6">
                <Link href="/" className="text-sm font-medium text-gray-900 transition-colors hover:text-primary">
                    TT Mem
                </Link>
                <div className="flex items-center">
                    {token ? (
                        <button
                            onClick={logout}
                            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
                        >
                            Logout
                        </button>
                    ) : (
                        <Link
                            href="/login"
                            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
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
                    <main className="container mx-auto px-4 py-5 md:px-6 md:py-6">
                        {children}
                    </main>
                    <AIChatWidget />
                </AppProviders>
            </body>
        </html>
    );
}