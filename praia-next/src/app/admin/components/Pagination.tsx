'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalResults?: number;
    pageSize?: number;
}

export default function Pagination({ currentPage, totalPages, totalResults, pageSize = 25 }: PaginationProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', page.toString());
        router.push(`?${params.toString()}`);
    };

    const startItem = totalResults ? (currentPage - 1) * pageSize + 1 : 0;
    const endItem = totalResults ? Math.min(currentPage * pageSize, totalResults) : 0;

    return (
        <div className="p-3 px-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left Box: Showing Range */}
            <div className="flex-1">
                {totalResults !== undefined && (
                    <div className="hidden sm:inline-block text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                        Exibindo <span className="text-slate-800">{startItem} a {endItem}</span> de <span className="text-slate-800">{totalResults}</span> registros
                    </div>
                )}
            </div>

            {/* Right Box: Paginator Control */}
            <div className="flex items-center gap-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">
                    Página <span className="text-slate-700">{currentPage}</span> de <span className="text-slate-700">{totalPages || 1}</span>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
