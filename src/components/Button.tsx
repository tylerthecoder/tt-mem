import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'default' | 'easy' | 'medium' | 'hard' | 'missed';
type ButtonSize = 'base' | 'sm';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
    variant = 'default',
    size = 'base',
    children,
    className = '',
    ...props
}) => {
    // Base styles
    const baseStyle = "rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

    // Size styles
    let sizeStyle = '';
    switch (size) {
        case 'sm':
            sizeStyle = "px-3 py-1 text-sm";
            break;
        case 'base':
        default:
            sizeStyle = "px-4 py-2";
            break;
    }

    // Variant styles
    let variantStyle = '';
    switch (variant) {
        case 'primary': // Used primary red before, map to a standard red or primary color
            variantStyle = "bg-primary hover:bg-red-700 text-white";
            break;
        case 'secondary': // Used secondary green before, map to a standard green or secondary color
            variantStyle = "bg-secondary hover:bg-green-700 text-white";
            break;
        case 'easy':
            variantStyle = "bg-green-600 hover:bg-green-700 text-white";
            break;
        case 'medium':
            variantStyle = "bg-blue-600 hover:bg-blue-700 text-white";
            break;
        case 'hard':
            variantStyle = "bg-orange-500 hover:bg-orange-600 text-white";
            break;
        case 'missed':
            variantStyle = "bg-red-600 hover:bg-red-700 text-white";
            break;
        case 'default':
        default:
            variantStyle = "bg-gray-500 hover:bg-gray-600 text-white";
            break;
    }

    const combinedClassName = `${baseStyle} ${sizeStyle} ${variantStyle} ${className}`;

    return (
        <button className={combinedClassName} {...props}>
            {children}
        </button>
    );
};

export default Button;