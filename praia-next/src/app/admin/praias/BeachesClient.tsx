'use client';

import { useState } from 'react';
import SearchFilter from '../components/SearchFilter';
import Pagination from '../components/Pagination';
import Link from 'next/link';
import { formatRegionLocale } from '@/lib/formatters';
import BeachModal from './BeachModal';
import { deleteBeach } from './actions';
import { 
    Plus, 
    Search, 
    Edit2, 
    Trash2, 
    ExternalLink, 
    MapPin, 
    Wind, 
    ClipboardList,
    MoreHorizontal
} from 'lucide-react';

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

    const formatWindWithIcons = (windString: string) => {
        if (!windString) return '--';
        const parts = windString.split(',').map(s => s.trim().toUpperCase());

        return parts.map(code => {
            const found = windDirections.find(w => w.code === code);
            if (found && found.icon) {
                return (
                    <span key={code} className="inline-flex items-center gap-1 font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200 text-[10px]" title={found.name}>
                        {code} <span className="text-[12px]">{found.icon}</span>
                    </span>
                );
            }
            return (
                <span key={code} className="inline-flex items-center gap-1 font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200 text-[10px]">
                    {code}
                </span>
            );
        });
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 flex-1 flex flex-col min-h-0">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestão de Praias</h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm">Controle as praias e configurações de balneabilidade.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80 group">
                        <SearchFilter placeholder="Buscar praia..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all shadow-sm" />
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <button
                        onClick={handleAdd}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 transition-all flex items-center gap-2 shrink-0 active:scale-95"
                    >
                        <Plus size={18} strokeWidth={3} />
                        Nova Praia
                    </button>
                </div>
            </header>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Cidade & Região</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nome da Praia</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Vento Ideal</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Laudos</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {beaches.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-16 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                                <Umbrella size={32} className="text-slate-200" />
                                            </div>
                                            <p className="text-sm font-medium">Nenhuma praia encontrada.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                beaches.map((beach) => (
                                    <tr key={beach.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                                    <MapPin size={12} className="text-blue-500" />
                                                    {beach.city?.name || 'Não definida'}
                                                </span>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5 bg-slate-100 rounded-md w-fit border border-slate-200">
                                                    {formatRegionLocale(beach.region)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{beach.name}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                     <span className="text-[10px] font-medium text-slate-400">Ponto:</span>
                                                     <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase">{beach.anchor?.name || 'Global'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap items-center gap-1.5 min-w-[120px]">
                                                {formatWindWithIcons(beach.idealWind)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {beach._count.reports > 0 ? (
                                                <Link
                                                    href={`/admin/ima?search=${encodeURIComponent(beach.name)}`}
                                                    className="inline-flex items-center gap-2 font-bold text-blue-600 hover:text-white hover:bg-blue-600 px-4 py-1.5 rounded-xl border border-blue-100 transition-all text-xs"
                                                >
                                                    <ClipboardList size={14} />
                                                    {beach._count.reports}
                                                </Link>
                                            ) : (
                                                <span className="text-slate-300 font-bold text-xs ring-1 ring-slate-100 px-3 py-1.5 rounded-xl inline-block">{beach._count.reports}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(beach)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Editar Praia"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(beach.id)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                    title="Excluir Praia"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <button className="p-2 text-slate-300 hover:text-slate-600 rounded-lg">
                                                    <MoreHorizontal size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
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
