import prisma from '@/lib/prisma';
import SearchFilter from '../components/SearchFilter';
import Pagination from '../components/Pagination';
import { Prisma } from '@prisma/client';
import { formatRegionLocale } from '@/lib/formatters';
import { 
    Users, 
    Globe, 
    ExternalLink, 
    Plus, 
    Edit2, 
    Trash2, 
    MapPin,
    CheckCircle2,
    PauseCircle
} from 'lucide-react';

export default async function AdminPartners({
    searchParams,
}: {
    searchParams: { page?: string; search?: string };
}) {
    const page = parseInt(searchParams.page || '1');
    const search = searchParams.search || '';
    const pageSize = 10;

    const where: Prisma.PartnerWhereInput = search
        ? {
            OR: [
                { name: { contains: search } },
                { description: { contains: search } },
                { region: { contains: search } },
            ],
        }
        : {};

    const [partners, total] = await Promise.all([
        prisma.partner.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.partner.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                            <Users size={20} />
                        </div>
                        Parceiros & Monetização
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm">Gerencie anunciantes locais e campanhas publicitárias regionais.</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-[350px] group">
                        <SearchFilter placeholder="Buscar por parceiro ou região..." className="w-full" />
                    </div>
                    <button className="bg-emerald-500 hover:bg-emerald-600 transition-all text-white px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-200 shrink-0 flex items-center gap-2 active:scale-95">
                        <Plus size={16} strokeWidth={3} />
                        Novo Parceiro
                    </button>
                </div>
            </div>

            {/* Partners Table */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-0">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse relative">
                        <thead className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md">
                            <tr className="border-b border-slate-100">
                                <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Anunciante</th>
                                <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Região Alvo</th>
                                <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Canal Digital</th>
                                <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-center">Status</th>
                                <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {partners.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-24 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-40">
                                            <Users size={48} className="text-slate-200" />
                                            <p className="text-slate-800 font-bold uppercase tracking-widest text-xs">Nenhum parceiro encontrado</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                partners.map((partner) => (
                                    <tr key={partner.id} className="hover:bg-amber-50/20 transition-all group">
                                        <td className="p-5 px-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-sm uppercase group-hover:bg-white group-hover:border-amber-400 group-hover:text-amber-600 transition-all">
                                                    {partner.name.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-sm uppercase tracking-tight">{partner.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium mt-0.5 max-w-xs truncate">{partner.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 px-8">
                                            <div className="flex items-center gap-2">
                                                <MapPin size={12} className="text-slate-300" />
                                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                                                    {formatRegionLocale(partner.region || '')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-5 px-8">
                                            {partner.url ? (
                                                <a 
                                                    href={partner.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-600 text-[10px] font-bold uppercase tracking-widest hover:bg-sky-500 hover:text-white transition-all border border-sky-100/50"
                                                >
                                                    <ExternalLink size={12} />
                                                    Visitar Página
                                                </a>
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 italic">
                                                    <Globe size={12} className="opacity-30" />
                                                    Offline
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-5 px-8 text-center">
                                            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.1em] ${
                                                partner.active 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                : 'bg-slate-50 text-slate-400 border-slate-200'
                                            }`}>
                                                {partner.active ? <CheckCircle2 size={12} /> : <PauseCircle size={12} />}
                                                {partner.active ? 'Ativo' : 'Pausado'}
                                            </div>
                                        </td>
                                        <td className="p-5 px-8 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all shadow-sm">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {total > 0 && (
                    <div className="p-6 bg-slate-50/30 border-t border-slate-100 shrink-0">
                        <Pagination currentPage={page} totalPages={totalPages} totalResults={total} />
                    </div>
                )}
            </div>
        </div>
    );
}
