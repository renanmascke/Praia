'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, 
    Umbrella, 
    Trophy, 
    Sun, 
    TestTube, 
    Activity, 
    Handshake, 
    ShieldCheck, 
    Settings, 
    LogOut, 
    ArrowLeft,
    Menu,
    X,
    Search,
    Bell,
    User,
    ChevronDown,
    Moon,
    SunMedium
} from 'lucide-react';

const menuItems = [
    { name: 'Painel Geral', href: '/admin', icon: LayoutDashboard },
    { name: 'Gestão de Praias', href: '/admin/praias', icon: Umbrella },
    { name: 'Ranking Diário', href: '/admin/ranking', icon: Trophy },
    { name: 'Previsão do Tempo', href: '/admin/previsao', icon: Sun },
    { name: 'Laudos IMA', href: '/admin/ima', icon: TestTube },
    { name: 'Monitoramento', href: '/admin/monitoramento', icon: Activity },
    { name: 'Parceiros & Anúncios', href: '/admin/parceiros', icon: Handshake },
    { name: 'Administradores', href: '/admin/usuarios', icon: ShieldCheck },
    { name: 'Configurações', href: '/admin/configuracoes', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) setSidebarOpen(false);
            else setSidebarOpen(true);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    return (
        <div className="flex h-screen bg-[#F1F5F9] text-slate-800 font-sans overflow-hidden">
            
            {/* Sidebar Overlay (Mobile) */}
            {isMobile && sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside 
                className={`
                    fixed md:relative z-50 h-full bg-[#1C2434] text-white transition-all duration-300 ease-in-out
                    ${sidebarOpen ? 'w-72 translate-x-0' : 'w-0 md:w-0 -translate-x-full md:translate-x-0 overflow-hidden'}
                `}
            >
                <div className="flex flex-col h-full">
                    {/* Sidebar Header */}
                    <div className="p-6 flex items-center justify-between shrink-0">
                        <Link href="/admin" className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">
                                i
                            </div>
                            <h2 className="text-xl font-bold tracking-tight">
                                inDica<span className="text-blue-500">Admin</span>
                            </h2>
                        </Link>
                        {isMobile && (
                            <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-slate-700 rounded">
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto no-scrollbar">
                        <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">MENU</p>
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link 
                                    key={item.href} 
                                    href={item.href}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all group
                                        ${isActive 
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                                    `}
                                >
                                    <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                                    {item.name}
                                </Link>
                            );
                        })}

                        <div className="pt-6 pb-2">
                             <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">SUPORTE</p>
                             <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
                                <ArrowLeft size={18} />
                                Voltar ao Site
                             </Link>
                        </div>
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-slate-700/50">
                        <a href="/api/auth/logout" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-all">
                            <LogOut size={18} />
                            Sair do Sistema
                        </a>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                
                {/* Header Global */}
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 z-30 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={toggleSidebar}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                        >
                            <Menu size={20} className="text-slate-600" />
                        </button>

                        <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-96 group focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <Search size={18} className="text-slate-400 mr-2" />
                            <input 
                                type="text" 
                                placeholder="Procurar no sistema..." 
                                className="bg-transparent border-none outline-none text-sm w-full text-slate-600"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="flex items-center bg-slate-100 rounded-full p-1 border border-slate-200">
                             <button className="p-1.5 rounded-full hover:bg-white hover:shadow-sm text-slate-500 transition-all">
                                 <SunMedium size={16} />
                             </button>
                             <button className="p-1.5 rounded-full bg-white shadow-sm text-blue-600 transition-all">
                                 <Moon size={16} />
                             </button>
                        </div>

                        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors border border-slate-200">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                        </button>

                        <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>

                        <button className="flex items-center gap-3 pl-2 group">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-bold text-slate-800 leading-none">Administrador</p>
                                <p className="text-[10px] font-medium text-slate-500 mt-1">admin@indica.pro</p>
                            </div>
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm overflow-hidden group-hover:border-blue-200 transition-all">
                                <User size={20} />
                            </div>
                            <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                        </button>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth">
                    <div className="max-w-[1600px] mx-auto pb-10">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
