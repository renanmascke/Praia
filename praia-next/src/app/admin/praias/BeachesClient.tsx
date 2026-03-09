'use client';

import { useState } from 'react';
import SearchFilter from '../components/SearchFilter';
import Pagination from '../components/Pagination';
import Link from 'next/link';
import { formatRegionLocale } from '@/lib/formatters';
import BeachModal from './BeachModal';
import { deleteBeach } from './actions';

interface BeachesClientProps {
    beaches: any[];
    windDirections: any[];
    total: number;
    totalPages: number;
    page: number;
}

export default function BeachesClient({ beaches, windDirections, total, totalPages, page }: BeachesClientProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBeach, setSelectedBeach] = useState<any>(null);

    const handleEdit = (beach: any) => {
        setSelectedBeach(beach);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setSelectedBeach(null);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta praia? Todos os laudos vinculados serão removidos.')) {
            try {
                await deleteBeach(id);
            } catch (error) {
                alert('Erro ao excluir praia.');
            }
        }
    };

    // Helper to format comma-separated winds with DB icons
    const formatWindWithIcons = (windString: string) => {
        if (!windString) return '--';
        const parts = windString.split(',').map(s => s.trim().toUpperCase());

        return parts.map(code => {
            const found = windDirections.find(w => w.code === code);
            if (found && found.icon) {
                return (
                    <span key={code} className="inline-flex items-center gap-1 font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md border border-slate-200" title={found.name}>
                        {code} <span className="text-[10px]">{found.icon}</span>
                    </span>
                );
            }
            return (
                <span key={code} className="inline-flex items-center gap-1 font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md border border-slate-200">
                    {code}
                </span>
            );
        });
    };

    return (
        <div className="animate-in fade-in duration-500 flex-1 flex flex-col min-h-0">
            <header className="mb-4 flex flex-col md:flex-row justify-between items-center flex-wrap gap-4 shrink-0">
                <div className="flex-1 min-w-[300px]">
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-1 flex items-center gap-3">
                        <span className="text-rose-500">🏖️</span> Praias Monitoradas
                    </h1>
                    <p className="text-slate-500 font-medium text-sm">Visualize as praias cadastradas no sistema do Praia Admin PRO.</p>
                </div>
                <div className="flex items-center gap-4 flex-1 md:flex-initial md:w-[400px]">
                    <SearchFilter placeholder="Buscar praia por nome..." className="relative w-full" />
                    <button
                        onClick={handleAdd}
                        className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-white px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-xs shadow-md shrink-0 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                        </svg>
                        Adicionar
                    </button>
                </div>
            </header>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
                <div className="overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse relative">
                        <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                            <tr className="border-b border-slate-200">
                                <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[15%]">Cidade</th>
                                <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[30%]">Praia</th>
                                <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[15%]">Região</th>
                                <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[15%]">Ponto Previsão</th>
                                <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[15%]">Vento Ideal</th>
                                <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[5%] text-center">Laudos</th>
                                <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[5%] text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {beaches.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-400 text-sm italic font-medium">
                                        Nenhuma praia encontrada.
                                    </td>
                                </tr>
                            ) : (
                                beaches.map((beach) => (
                                    <tr key={beach.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-2.5 px-4">
                                            <div className="font-medium text-slate-500 text-[10px]">{beach.city?.name || '--'}</div>
                                        </td>
                                        <td className="p-2.5 px-4">
                                            <div className="font-bold text-slate-800 text-xs">{beach.name}</div>
                                        </td>
                                        <td className="p-2.5 px-4">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border border-slate-200 inline-block">
                                                {formatRegionLocale(beach.region)}
                                            </span>
                                        </td>
                                        <td className="p-2.5 px-4">
                                            <div className="font-bold text-blue-500 text-[9px] uppercase tracking-wider">
                                                {beach.anchor?.name || 'Global'}
                                            </div>
                                        </td>
                                        <td className="p-2.5 px-4">
                                            <div className="flex flex-wrap items-center gap-1 text-[8px] uppercase tracking-widest text-slate-600 font-bold">
                                                {formatWindWithIcons(beach.idealWind)}
                                            </div>
                                        </td>
                                        <td className="p-2.5 px-4 text-center text-xs">
                                            {beach._count.reports > 0 ? (
                                                <Link
                                                    href={`/admin/ima?search=${encodeURIComponent(beach.name)}`}
                                                    className="inline-block font-black text-blue-500 hover:text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-full transition-all"
                                                >
                                                    {beach._count.reports}
                                                </Link>
                                            ) : (
                                                <span className="text-slate-400 font-bold">{beach._count.reports}</span>
                                            )}
                                        </td>
                                        <td className="p-2.5 px-4 text-right">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => handleEdit(beach)}
                                                    className="text-[9px] font-black uppercase tracking-widest text-sky-500 hover:text-sky-700 transition-colors"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(beach.id)}
                                                    className="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-colors"
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="shrink-0">
                    <Pagination currentPage={page} totalPages={totalPages} totalResults={total} />
                </div>
            </div>

            <BeachModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                beach={selectedBeach}
            />
        </div>
    );
}
