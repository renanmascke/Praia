import prisma from '@/lib/prisma';
import ConfigForm from './ConfigForm';
import { initDefaultConfigs } from '@/lib/system-config';
import { Settings, Sliders, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
    let configs = await (prisma as any).systemConfig.findMany({
        orderBy: { key: 'asc' }
    });

    if (configs.length === 0) {
        await initDefaultConfigs();
        configs = await (prisma as any).systemConfig.findMany({
            orderBy: { key: 'asc' }
        });
    }

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-lg shadow-sky-200">
                            <Settings size={20} />
                        </div>
                        Configurações Globais
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm">Controle as variáveis operacionais e flags de comportamento do ecossistema.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-1 gap-10">
                <ConfigForm initialConfigs={configs} />
            </div>
        </div>
    );
}
