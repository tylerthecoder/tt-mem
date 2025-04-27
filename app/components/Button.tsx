import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'default' | 'easy' | 'medium' | 'hard' | 'missed';
type ButtonSize = 'base' | 'sm';

// Define allowed element types for the 'as' prop
type AsProp = 'button' | 'a';

// Use a generic approach for props to allow different element types
// Base props common to all variants
interface ButtonBaseProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children: React.ReactNode;
    className?: string;
    as?: AsProp;
}

// Define specific props based on the 'as' prop
type ButtonProps<T extends AsProp = 'button'> = ButtonBaseProps & (
    T extends 'a'
    ? Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps>
    : Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps>
);

// Removed React.forwardRef for simplicity due to type complexity
const Button = <T extends AsProp = 'button'>(
    {
        as,
        variant = 'default',
        size = 'base',
        children,
        className = '',
        ...props
    }: ButtonProps<T>
) => {
    const Component = as || 'button'; // Determine component type

    // Base styles
    const baseStyle = "inline-block rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

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
        case 'primary':
            variantStyle = "bg-primary hover:bg-red-700 text-white";
            break;
        case 'secondary':
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

    // Use type assertion for props to satisfy Component rendering
    return (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <Component className={combinedClassName} {...props as any}>
            {children}
        </Component>
    );
};

// Button.displayName = 'Button'; // No longer needed without forwardRef

export default Button;