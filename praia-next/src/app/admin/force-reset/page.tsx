'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ShieldAlert, 
    Lock, 
    ShieldCheck, 
    Fingerprint, 
    ArrowRight, 
    Loader2,
    AlertCircle
} from 'lucide-react';

export default function ForceResetPage() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        if (newPassword.length < 6) {
            setError('A nova senha deve ter no mínimo 6 caracteres.');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Erro ao redefinir a senha');
            }

            router.push('/admin');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
            {/* Advanced Background Effects */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            
            <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] shadow-2xl border border-white/10 relative z-10 animate-in fade-in zoom-in-95 duration-700">
                
                <header className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 mb-6 shadow-2xl shadow-rose-500/10">
                        <ShieldAlert size={40} strokeWidth={1.5} />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight leading-tight mb-2">
                        Reforço de Segurança
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
                        Handshake de Identidade Requerido
                    </p>
                </header>

                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl mb-8 flex items-center gap-3 animate-in slide-in-from-top-2">
                        <AlertCircle size={18} />
                        <span className="text-xs font-bold">{error}</span>
                    </div>
                )}

                <form onSubmit={handleReset} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Nova Senha de Acesso</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-rose-500 transition-colors">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                required
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-rose-500 focus:bg-white/10 transition-all text-sm font-bold placeholder:text-slate-700"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Confirmar Assinatura</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-rose-500 transition-colors">
                                <Fingerprint size={18} />
                            </div>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-rose-500 focus:bg-white/10 transition-all text-sm font-bold placeholder:text-slate-700"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white font-black py-5 rounded-[1.5rem] uppercase tracking-[0.25em] text-[11px] transition-all shadow-2xl shadow-rose-900/20 mt-6 active:scale-95 flex items-center justify-center gap-3 group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                        {loading ? 'Sincronizando...' : 'Ativar e Acessar'}
                    </button>
                    
                    <p className="text-center text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-8 flex items-center justify-center gap-2 opacity-60">
                        <Lock size={10} />
                        Conexão encriptada de ponta a ponta
                    </p>
                </form>
            </div>
            
            <footer className="mt-12 text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                Praia Admin Framework • Security Layer 4.0
            </footer>
        </div>
    );
}
