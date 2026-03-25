import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface Props {
    value: string;
    onChange: (val: string) => void;
    options: string[];
    placeholder: string;
    icon: any;
}

export const AutocompleteSearch: React.FC<Props> = ({ value, onChange, options, placeholder, icon: Icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (value.trim() === '') {
            setSuggestions([]);
        } else {
            const filtered = options.filter(opt => 
                opt.toLowerCase().includes(value.toLowerCase()) && 
                opt.toLowerCase() !== value.toLowerCase()
            ).slice(0, 5);
            setSuggestions(filtered);
        }
    }, [value, options]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={wrapperRef} className="relative flex-1 w-full group">
            <Icon size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
            
            <input
                type="text"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className="w-full h-14 pl-14 pr-12 bg-gray-50 dark:bg-slate-800/50 rounded-2xl font-black text-xs outline-none focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 border-2 border-transparent focus:border-indigo-600/20 transition-all dark:text-slate-200"
            />

            {value && (
                <button 
                    onClick={() => { onChange(''); setSuggestions([]); }}
                    className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-300 hover:text-rose-500 transition-colors"
                >
                    <X size={14} />
                </button>
            )}

            <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />

            {isOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                onChange(suggestion);
                                setSuggestions([]);
                                setIsOpen(false);
                            }}
                            className="w-full text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-all"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
