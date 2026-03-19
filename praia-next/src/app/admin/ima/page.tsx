import prisma from '@/lib/prisma';
import IMATable from './IMATable';
import { Prisma } from '@prisma/client';
import { Activity, Search } from 'lucide-react';
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
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-200">
                            <Activity size={20} />
                        </div>
                        Laudos IMA
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm">Histórico laboratorial extraído oficialmente do Instituto do Meio Ambiente.</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-[400px]">
                    <div className="relative w-full group">
                        <SearchFilter placeholder="Buscar por praia ou localidade..." className="w-full" />
                    </div>
                </div>
            </div>

            <IMATable
                reports={reports as any}
                currentPage={page}
                totalPages={totalPages}
                totalResults={total}
            />
        </div>
    );
}
