import React from 'react';

interface SpinnerProps {
    size?: 'sm' | 'base';
    className?: string;
}

export default function Spinner({ size = 'base', className = '' }: SpinnerProps) {
    const sizeClasses = size === 'sm' ? 'h-5 w-5' : 'h-8 w-8';
    const borderSize = size === 'sm' ? 'border-2' : 'border-4';

    return (
        <div
            className={`animate-spin rounded-full ${sizeClasses} ${borderSize} border-gray-300 border-t-primary ${className}`}
            role="status"
            aria-label="Loading..."
        />
    );
}