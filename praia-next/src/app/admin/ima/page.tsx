import prisma from '@/lib/prisma';
import IMATable from './IMATable';
import { Prisma } from '@prisma/client';
import SearchFilter from '@/app/admin/components/SearchFilter';

export default async function AdminIMAPage({
    searchParams,
}: {
    searchParams: { page?: string; search?: string };
}) {
    const page = parseInt(searchParams.page || '1');
    const search = searchParams.search || '';
    const pageSize = 25;

    const where: Prisma.ReportWhereInput = search
        ? {
            beach: {
                name: {
                    contains: search,
                },
            },
        }
        : {};

    const [reports, total] = await Promise.all([
        prisma.report.findMany({
            where,
            orderBy: { date: 'desc' },
            include: { beach: true },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.report.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="animate-in fade-in duration-500 flex-1 flex flex-col min-h-0">
            <header className="mb-4 flex flex-col md:flex-row justify-between items-center flex-wrap gap-4 shrink-0">
                <div className="flex-1 min-w-[300px]">
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-1 flex items-center gap-3">
                        <span className="text-teal-500">🧪</span> Laudos IMA
                    </h1>
                    <p className="text-slate-500 font-medium text-sm">Visualize o histórico de laudos laboratoriais extraídos oficialmente do Instituto do Meio Ambiente.</p>
                </div>
                <div className="flex items-center gap-4 flex-1 md:flex-initial md:w-[400px]">
                    <SearchFilter placeholder="Buscar por praia..." className="relative w-full" />
                </div>
            </header>

            <IMATable
                reports={reports as any}
                currentPage={page}
                totalPages={totalPages}
                totalResults={total}
            />
        </div>
    );
}
