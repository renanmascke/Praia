'use client';

import { useState } from 'react';
import { updateConfigs } from './actions';
import { useRouter } from 'next/navigation';

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
            setMessage({ type: 'success', text: 'Configurações atualizadas com sucesso!' });
            router.refresh();
        } else {
            setMessage({ type: 'error', text: `Erro: ${result.error}` });
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
            {message && (
                <div className={`p-4 rounded-2xl border ${
                    message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
                } text-sm font-bold animate-in fade-in slide-in-from-top-2`}>
                    {message.text}
                </div>
            )}

            <div className="grid gap-6">
                {configs.map(config => (
                    <div key={config.key} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-sky-300 transition-colors space-y-4 group">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-slate-800 font-black uppercase tracking-tight text-sm">
                                    {config.key.replace(/_/g, ' ')}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                    {config.description || 'Parâmetro do sistema'}
                                </p>
                            </div>
                        </div>

                        <div className="relative group-focus-within:ring-2 group-focus-within:ring-sky-500/20 rounded-xl transition-all">
                            <input
                                type="number"
                                value={config.value}
                                onChange={(e) => handleChange(config.key, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-slate-900 font-bold focus:bg-white focus:border-sky-300 transition-all outline-none"
                                min="1"
                                max="16"
                                required
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                                Dias
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white rounded-xl py-3.5 font-black uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg shadow-slate-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
                {loading ? (
                    <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Salvando...
                    </>
                ) : (
                    <>
                        <span>💾</span> Salvar Alterações
                    </>
                )}
            </button>
        </form>
    );
}
