'use client';

import { useState, useRef, useEffect } from 'react';

interface Option {
    id: string;
    name: string;
    subtext?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Selecionar...',
    label,
    className = ''
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(o => o.id === value);

    const filteredOptions = options.filter(o =>
        o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.subtext && o.subtext.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">
                    {label}
                </label>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-left shadow-sm hover:border-blue-300 transition-all focus:ring-2 focus:ring-blue-500/10 outline-none flex items-center justify-between"
            >
                <div className="truncate">
                    {selectedOption ? (
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                            {selectedOption.name}
                        </span>
                    ) : (
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">
                            {placeholder}
                        </span>
                    )}
                </div>
                <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-[150] mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-blue-500/10 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[300px]">
                    <div className="p-2 border-b border-slate-50 bg-slate-50/30">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Pesquisar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-blue-400 transition-all"
                        />
                    </div>

                    <div className="overflow-y-auto custom-scrollbar flex-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.id);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors flex flex-col ${value === option.id ? 'bg-blue-50/50' : ''}`}
                                >
                                    <span className={`text-[11px] font-bold uppercase tracking-tight ${value === option.id ? 'text-blue-600' : 'text-slate-700'}`}>
                                        {option.name}
                                    </span>
                                    {option.subtext && (
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            {option.subtext}
                                        </span>
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-6 text-center text-[10px] font-bold text-slate-400 uppercase italic">
                                Nenhum resultado encontrado.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
