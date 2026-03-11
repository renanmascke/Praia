import prisma from '@/lib/prisma';
import ConfigForm from './ConfigForm';
import { initDefaultConfigs } from '@/lib/system-config';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
    let configs = await (prisma as any).systemConfig.findMany({
        orderBy: { key: 'asc' }
    });

    // Se estiver vazio, inicializa os padrões e busca novamente
    if (configs.length === 0) {
        await initDefaultConfigs();
        configs = await (prisma as any).systemConfig.findMany({
            orderBy: { key: 'asc' }
        });
    }

    return (
        <div className="space-y-10 pb-20">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-center flex-wrap gap-4 shrink-0">
                <div className="flex-1 min-w-[300px]">
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-1 flex items-center gap-3">
                        <span className="text-sky-500">⚙️</span> Ajustes do Sistema
                    </h1>
                    <p className="text-slate-500 font-medium text-sm">Gerencie os parâmetros globais de sincronização e processamento.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-12">
                    <ConfigForm initialConfigs={configs} />
                </div>
            </div>
        </div>
    );
}
