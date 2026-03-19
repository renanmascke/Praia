import prisma from '@/lib/prisma';
import SyncStatusTable from './SyncStatusTable';
import SyncGrid from '@/components/admin/SyncGrid';
import ApiQuotaDisplay from './ApiQuotaDisplay';
import { getBrazilToday, getStartOfMonthBrazil } from '@/lib/date-utils';
import { Activity, ShieldCheck, Search, Database, RefreshCw } from 'lucide-react';
import SearchFilter from '../components/SearchFilter';

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
                (SELECT message FROM SyncLog WHERE (runId = sl.runId OR id = sl.id) ORDER BY startTime DESC LIMIT 1) as lastMessage,
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
                provider: 'GOOGLE_WEATHER',
                date: { gte: firstDayOfMonth }
            },
            _sum: { count: true }
        })
    ]);

    const weatherMonthlyTotal = monthlyQuota._sum.count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <Activity size={20} />
                        </div>
                        Monitoramento do Ecossistema
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm">Controle de sincronização, quotas de API e integridade dos dados.</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-[400px]">
                    <div className="relative w-full group">
                        <SearchFilter placeholder="Filtrar por tipo, status ou run ID..." className="w-full" />
                    </div>
                </div>
            </div>

            {/* Quick Actions & Quotas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <Database size={16} className="text-blue-500" />
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Consumo de Infraestrutura</h2>
                    </div>
                    <ApiQuotaDisplay
                        initialQuotas={quotas}
                        history={history}
                        weatherMonthlyTotal={weatherMonthlyTotal}
                    />
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <RefreshCw size={16} className="text-orange-500" />
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sincronização Manual</h2>
                    </div>
                    <div className="flex-1">
                        <SyncGrid />
                    </div>
                </div>
            </div>

            {/* Main Log Table */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Auditoria de Execuções</h2>
                </div>
                <SyncStatusTable logs={logs} />
            </div>
        </div>
    );
}
