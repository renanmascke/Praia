import Link from 'next/link';
import { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <div className="fixed inset-0 bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800 overflow-hidden z-50">

            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 bg-slate-900 text-slate-300 md:h-screen shadow-xl p-6 flex flex-col shrink-0 overflow-y-auto">
                <div className="mb-10 text-center md:text-left shrink-0">
                    <h2 className="text-white text-xl font-black italic uppercase tracking-tighter">
                        inDica Admin <span className="text-sky-500">PRO</span>
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Gestão Multicidade
                    </p>
                </div>

                <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
                    <Link href="/admin" className="block px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm font-semibold tracking-wide">
                        📊 Painel Geral
                    </Link>
                    <Link href="/admin/praias" className="block px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm font-semibold tracking-wide">
                        🏖️ Gestão de Praias
                    </Link>
                    <Link href="/admin/ranking" className="block px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm font-semibold tracking-wide border-l-4 border-orange-500 bg-slate-800/50 text-white">
                        🏆 Ranking Diário
                    </Link>
                    <Link href="/admin/previsao" className="block px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm font-semibold tracking-wide">
                        🌤️ Previsão do Tempo
                    </Link>
                    <Link href="/admin/ima" className="block px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm font-semibold tracking-wide">
                        🧪 Laudos IMA
                    </Link>
                    <Link href="/admin/monitoramento" className="block px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm font-semibold tracking-wide">
                        🔄 Monitoramento
                    </Link>
                    <Link href="/admin/parceiros" className="block px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm font-semibold tracking-wide">
                        🤝 Parceiros & Anúncios
                    </Link>
                    <Link href="/admin/usuarios" className="block px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm font-semibold tracking-wide">
                        🛡️ Administradores
                    </Link>
                </nav>

                <div className="mt-8 pt-6 border-t border-slate-800 space-y-2 shrink-0">
                    <Link href="/" className="block px-4 py-3 rounded-xl bg-slate-800 text-sky-400 hover:bg-slate-700 hover:text-sky-300 transition-colors text-sm font-bold tracking-wide text-center uppercase">
                        ← Voltar ao Site
                    </Link>
                    <a href="/api/auth/logout" className="block px-4 py-3 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors text-sm font-bold tracking-wide text-center uppercase">
                        🚪 Sair
                    </a>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-4 md:px-10 lg:px-12 md:py-8 lg:py-8 overflow-y-auto custom-scrollbar bg-slate-50 relative flex flex-col">
                {children}
            </main>

        </div>
    );
}
