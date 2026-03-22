'use client';

import React from 'react';
import Link from 'next/link';

interface PageHeaderProps {
    title: React.ReactNode;
    backHref?: string;
    backLabel?: string;
    actions?: React.ReactNode;
}

interface PageHeaderActionLinkProps {
    href: string;
    children: React.ReactNode;
    icon?: React.ReactNode;
}

interface PageHeaderActionButtonProps {
    type?: 'button' | 'submit' | 'reset';
    onClick?: React.ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
    children: React.ReactNode;
    icon?: React.ReactNode;
    disabled?: boolean;
}

const actionClassName = 'inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-primary disabled:opacity-50';

export function PageHeaderActionLink({
    href,
    children,
    icon,
}: PageHeaderActionLinkProps) {
    return (
        <Link href={href} className={actionClassName}>
            {icon}
            <span>{children}</span>
        </Link>
    );
}

export function PageHeaderActionButton({
    type = 'button',
    onClick,
    children,
    icon,
    disabled,
}: PageHeaderActionButtonProps) {
    return (
        <button type={type} onClick={onClick} disabled={disabled} className={actionClassName}>
            {icon}
            <span>{children}</span>
        </button>
    );
}

export default function PageHeader({
    title,
    backHref,
    backLabel = 'Back',
    actions,
}: PageHeaderProps) {
    return (
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-gray-200 pb-2">
            <div className="min-w-0">
                {backHref ? (
                    <Link
                        href={backHref}
                        className={actionClassName}
                    >
                        <span aria-hidden="true">←</span>
                        <span>{backLabel}</span>
                    </Link>
                ) : (
                    <div />
                )}
            </div>
            <h1 className="truncate text-center text-sm font-medium text-gray-900">
                {title}
            </h1>
            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                {actions}
            </div>
        </div>
    );
}
