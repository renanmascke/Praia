import prisma from '@/lib/prisma';
import ConfigForm from './ConfigForm';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
    const configs = await (prisma as any).systemConfig.findMany({
        orderBy: { key: 'asc' }
    });

    return (
        <div className="space-y-10 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <span className="text-xs font-black uppercase tracking-widest">Administração</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-900">Configurações</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">
                        Ajustes do <span className="text-sky-500">Sistema</span>
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        Gerencie os parâmetros globais de sincronização e processamento.
                    </p>
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
