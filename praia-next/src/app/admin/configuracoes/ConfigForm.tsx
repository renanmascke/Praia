'use client';

import { useState } from 'react';
import { updateConfigs } from './actions';
import { useRouter } from 'next/navigation';
import { 
    Settings2, 
    Save, 
    Info, 
    AlertCircle, 
    CheckCircle2, 
    Loader2, 
    Sliders,
    Calendar,
    Zap
} from 'lucide-react';

interface Config {
    key: string;
    value: string;
    description: string | null;
}

export default function ConfigForm({ initialConfigs }: { initialConfigs: Config[] }) {
    const [configs, setConfigs] = useState(initialConfigs);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const router = useRouter();

    const handleChange = (key: string, value: string) => {
        setConfigs(prev => prev.map(c => c.key === key ? { ...c, value } : c));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const result = await updateConfigs(configs.map(c => ({ key: c.key, value: c.value })));

        if (result.success) {
            setMessage({ type: 'success', text: 'Configurações sincronizadas no núcleo do sistema.' });
            router.refresh();
            setTimeout(() => setMessage(null), 5000);
        } else {
            setMessage({ type: 'error', text: `Falha na sincronização: ${result.error}` });
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-10 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            {message && (
                <div className={`p-6 rounded-[1.5rem] border flex items-center gap-4 shadow-xl transition-all animate-in zoom-in-95 duration-300 ${
                    message.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700 shadow-emerald-50' 
                    : 'bg-rose-50 border-rose-100 text-rose-700 shadow-rose-50'
                }`}>
                    <div className={`p-2 rounded-xl bg-white shadow-sm ${message.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Status do Sistema</p>
                        <p className="text-sm font-bold">{message.text}</p>
                    </div>
                </div>
            )}

            <div className="grid gap-6">
                <div className="flex items-center gap-2 mb-2">
                    <Sliders size={16} className="text-blue-500" />
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Parâmetros de Operação</h2>
                </div>
                
                {configs.map(config => (
                    <div key={config.key} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl hover:shadow-2xl hover:border-blue-400 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="flex-1">
                            <h3 className="text-slate-900 font-bold uppercase tracking-tight text-base mb-1 group-hover:text-blue-600 transition-colors">
                                {config.key.replace(/_/g, ' ')}
                            </h3>
                            <div className="flex items-center gap-2">
                                <Info size={12} className="text-slate-300" />
                                <p className="text-[11px] text-slate-400 font-medium italic">
                                    {config.description || 'Configuração mestre de runtime.'}
                                </p>
                            </div>
                        </div>

                        <div className="relative w-full md:w-[180px]">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors pointer-events-none">
                                <Calendar size={16} />
                            </div>
                            <input
                                type="number"
                                value={config.value}
                                onChange={(e) => handleChange(config.key, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-12 py-4 text-slate-900 font-black focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none shadow-inner"
                                min="1"
                                max="31"
                                required
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                                Dias
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 text-white rounded-[1.5rem] py-5 font-black uppercase tracking-[0.25em] text-[11px] hover:bg-blue-600 transition-all shadow-2xl shadow-slate-200 active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-3 group overflow-hidden relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Zap size={18} fill="currentColor" />
                    )}
                    {loading ? 'Sincronizando...' : 'Publicar Alterações'}
                </button>
                <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-6 opacity-60">
                    Alterações impactam imediatamente todos os módulos de processamento.
                </p>
            </div>
        </form>
    );
}
