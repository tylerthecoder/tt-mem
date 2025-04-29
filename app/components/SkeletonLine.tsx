import React from 'react';

interface SkeletonLineProps {
    width?: string; // e.g., 'w-3/4', 'w-1/2'
    height?: string; // e.g., 'h-4', 'h-6'
    className?: string;
}

export default function SkeletonLine({ width = 'w-full', height = 'h-4', className = '' }: SkeletonLineProps) {
    return (
        <div
            className={`bg-gray-200 rounded animate-pulse ${height} ${width} ${className}`}
            aria-hidden="true"
        />
    );
}