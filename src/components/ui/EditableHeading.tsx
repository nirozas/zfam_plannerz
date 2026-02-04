import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils'; // Assuming you have a class merger utility, otherwise standard string interpolation

interface EditableHeadingProps {
    value: string;
    onSave: (newValue: string) => void;
    variant: 'h1' | 'body' | 'card-title';
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
}

export const EditableHeading: React.FC<EditableHeadingProps> = ({
    value,
    onSave,
    variant,
    placeholder = "Untitled",
    className
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTempValue(value);
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (tempValue.trim() !== value) {
            onSave(tempValue.trim() || placeholder);
        } else {
            setTempValue(value); // Revert if empty/same
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setTempValue(value);
            setIsEditing(false);
        }
    };

    const baseStyles = "transition-all duration-200 rounded px-1 -ml-1 border border-transparent hover:border-gray-200 hover:bg-black/5 cursor-text truncate block max-w-full";
    const editStyles = "outline-none ring-2 ring-indigo-500 bg-white text-gray-900 px-1 -ml-1 rounded shadow-sm w-full";

    const variantStyles = {
        'h1': "text-xl font-bold text-gray-800",
        'card-title': "font-bold text-lg text-gray-900 text-center",
        'body': "text-sm text-gray-600"
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className={cn(variantStyles[variant], editStyles, className)}
                placeholder={placeholder}
            />
        );
    }

    return (
        <span
            onClick={() => setIsEditing(true)}
            className={cn(baseStyles, variantStyles[variant], className)}
            title="Click to rename"
        >
            {value || placeholder}
        </span>
    );
};
