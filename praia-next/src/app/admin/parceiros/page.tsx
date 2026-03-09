import prisma from '@/lib/prisma';
import SearchFilter from '../components/SearchFilter';
import Pagination from '../components/Pagination';
import { Prisma } from '@prisma/client';

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
        <div className="animate-in fade-in duration-500 flex-1 flex flex-col min-h-0">
            <header className="mb-4 flex flex-col md:flex-row justify-between items-center flex-wrap gap-4 shrink-0">
                <div className="flex-1 min-w-[300px]">
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-1 flex items-center gap-3">
                        <span className="text-amber-500">🤝</span> Parceiros & Monetização
                    </h1>
                    <p className="text-slate-500 font-medium text-sm">Gerencie os anunciantes locais exibidos nas páginas das praias.</p>
                </div>
                <div className="flex items-center gap-4 flex-1 md:flex-initial md:w-[500px]">
                    <SearchFilter placeholder="Buscar por parceiro ou região..." className="relative w-full" />
                    <button className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-white px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-xs shadow-md shrink-0 flex items-center gap-2">
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
                                <th className="p-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Anunciante</th>
                                <th className="p-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Região Alvo</th>
                                <th className="p-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Link Externo</th>
                                <th className="p-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                <th className="p-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {partners.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-400 text-sm italic font-medium">
                                        Nenhum parceiro encontrado.
                                    </td>
                                </tr>
                            ) : (
                                partners.map((partner) => (
                                    <tr key={partner.id} className="hover:bg-amber-50/30 transition-colors group">
                                        <td className="p-4 px-6">
                                            <div className="font-bold text-slate-800 text-sm uppercase tracking-tight">{partner.name}</div>
                                            <div className="text-[10px] text-slate-400 font-semibold mt-1 max-w-xs truncate">{partner.description}</div>
                                        </td>
                                        <td className="p-4 px-6">
                                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border border-slate-200">
                                                {partner.region}
                                            </span>
                                        </td>
                                        <td className="p-4 px-6">
                                            {partner.url ? (
                                                <a href={partner.url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-sky-500 hover:underline">
                                                    Acessar Link ↗
                                                </a>
                                            ) : (
                                                <span className="text-[11px] font-bold text-slate-400">Sem Link</span>
                                            )}
                                        </td>
                                        <td className="p-4 px-6 text-center">
                                            <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border ${partner.active ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                {partner.active ? 'Ativo' : 'Pausado'}
                                            </span>
                                        </td>
                                        <td className="p-4 px-6 text-right">
                                            <button className="text-[10px] font-bold uppercase tracking-widest text-sky-500 hover:text-sky-700 transition-colors mr-4">
                                                Editar
                                            </button>
                                            <button className="text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-colors">
                                                Excluir
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination currentPage={page} totalPages={totalPages} totalResults={total} />
            </div>
        </div>
    );
}
