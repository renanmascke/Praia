import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import Pagination from '../components/Pagination';
import SearchFilter from '../components/SearchFilter';
import SyncStatusTable from './SyncStatusTable';
import SyncGrid from '@/components/admin/SyncGrid';
import ApiQuotaDisplay from './ApiQuotaDisplay';
import { getBrazilToday, getStartOfMonthBrazil } from '@/lib/date-utils';

export default async function AdminSyncLogsPage({
    searchParams,
}: {
    searchParams: { page?: string; search?: string };
}) {
    const page = parseInt(searchParams.page || '1');
    const search = searchParams.search || '';
    const pageSize = 25;

    const today = getBrazilToday();
    const firstDayOfMonth = getStartOfMonthBrazil();

    const thirtyDaysAgo = getBrazilToday();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const [logs, total, quotas, history, monthlyQuota]: [any[], any, any, any, any] = await Promise.all([
        (prisma as any).$queryRawUnsafe(`
            SELECT 
                COALESCE(sl.runId, sl.id) as executionId,
                MIN(sl.startTime) as startTime,
                MAX(sl.endTime) as endTime,
                GROUP_CONCAT(DISTINCT sl.type) as types,
                GROUP_CONCAT(DISTINCT sl.status) as statuses,
                COUNT(*) as stepCount,
                SUM((SELECT COUNT(*) FROM SyncStepLog WHERE logId = sl.id)) as detailCount,
                /* Pegamos a mensagem do último registro se for um grupo */
                (SELECT message FROM SyncLog WHERE (runId = sl.runId OR id = sl.id) ORDER BY startTime DESC LIMIT 1) as lastMessage,
                /* JSON data para o frontend abrir os detalhes */
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', sl.id,
                        'type', sl.type,
                        'startTime', sl.startTime,
                        'endTime', sl.endTime,
                        'status', sl.status,
                        'message', sl.message,
                        'stepCount', (SELECT COUNT(*) FROM SyncStepLog WHERE logId = sl.id)
                    )
                ) as stepsJson
            FROM SyncLog sl
            ${search ? `WHERE sl.type LIKE '%${search}%' OR sl.status LIKE '%${search}%' OR sl.message LIKE '%${search}%' OR sl.runId LIKE '%${search}%'` : ''}
            GROUP BY executionId
            ORDER BY startTime DESC 
            LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
        `),
        (prisma as any).$queryRawUnsafe(`
            SELECT COUNT(DISTINCT COALESCE(runId, id)) as count FROM SyncLog
            ${search ? `WHERE type LIKE '%${search}%' OR status LIKE '%${search}%' OR message LIKE '%${search}%' OR runId LIKE '%${search}%'` : ''}
        `).then((res: any) => Number(res[0].count)),
        (prisma as any).apiQuota.findMany({
            where: { date: today }
        }),
        (prisma as any).apiQuota.findMany({
            where: {
                date: {
                    gte: thirtyDaysAgo
                }
            },
            orderBy: { date: 'asc' }
        }),
        (prisma as any).apiQuota.aggregate({
            where: {
                provider: 'WEATHERAPI',
                date: { gte: firstDayOfMonth }
            },
            _sum: { count: true }
        })
    ]);

    const weatherMonthlyTotal = monthlyQuota._sum.count || 0;

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="animate-in fade-in duration-500 flex-1 flex flex-col min-h-0">
            <header className="mb-4 flex flex-col md:flex-row justify-between items-center flex-wrap gap-4 shrink-0">
                <div className="flex-1 min-w-[300px]">
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-1 flex items-center gap-3">
                        <span className="text-blue-500">🔄</span> Histórico de Sincronização
                    </h1>
                    <p className="text-slate-500 font-medium text-sm">Monitore e dispare manualmente as atualizações de dados do sistema.</p>
                </div>
                <div className="flex items-center gap-4 flex-1 md:flex-initial md:w-[400px]">
                    <SearchFilter placeholder="Filtrar por tipo, status ou mensagem..." className="relative w-full" />
                </div>
            </header>

            <div className="shrink-0 mb-6">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    Controle de Quotas Diárias
                </h2>
                <ApiQuotaDisplay
                    initialQuotas={quotas}
                    history={history}
                    weatherMonthlyTotal={weatherMonthlyTotal}
                />
            </div>

            <div className="shrink-0 mb-4">
                <SyncGrid />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
                <div className="overflow-y-auto custom-scrollbar">
                    <SyncStatusTable logs={logs} />
                </div>
                <div className="shrink-0">
                    <Pagination currentPage={page} totalPages={totalPages} totalResults={total} />
                </div>
            </div>
        </div>
    );
}
