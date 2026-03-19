'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SearchFilter from '../app/admin/components/SearchFilter';
import Pagination from '../app/admin/components/Pagination';
import { 
    User, 
    Mail, 
    ShieldCheck, 
    ShieldAlert, 
    Edit2, 
    RefreshCcw, 
    Trash2, 
    X, 
    Lock,
    Key,
    Fingerprint,
    CheckCircle2,
    AlertTriangle,
    Plus,
    Loader2
} from 'lucide-react';

interface UsersClientProps {
    initialUsers: any[];
    currentUserId: string;
    currentPage: number;
    totalPages: number;
    totalResults: number;
}

export default function UsersClient({
    initialUsers,
    currentUserId,
    currentPage,
    totalPages,
    totalResults
}: UsersClientProps) {
    const [users, setUsers] = useState(initialUsers);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    const router = useRouter();

    useEffect(() => {
        setUsers(initialUsers);
    }, [initialUsers]);

    const openNewModal = () => {
        setEditingUser(null);
        setName('');
        setEmail('');
        setModalOpen(true);
    };

    const openEditModal = (user: any) => {
        setEditingUser(user);
        setName(user.name);
        setEmail(user.email);
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingUser) {
                const res = await fetch(`/api/admin/users/${editingUser.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email }),
                });
                if (res.ok) {
                    router.refresh();
                } else {
                    const err = await res.json();
                    alert(err.message || 'Erro ao atualizar usuário.');
                }
            } else {
                const res = await fetch('/api/admin/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email }),
                });
                if (res.ok) {
                    alert('Usuário criado. O e-mail com a senha temporária foi enviado.');
                    router.refresh();
                } else {
                    const err = await res.json();
                    alert(err.message || 'Erro ao criar usuário.');
                }
            }
            setModalOpen(false);
        } catch (err) {
            alert('Ocorreu um erro de rede.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (id: string, userEmail: string) => {
        if (!confirm(`Deseja realmente gerar e enviar uma nova senha temporária para ${userEmail}?`)) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resetPassword: true }),
            });
            if (res.ok) {
                alert('Nova senha gerada e enviada com sucesso!');
                router.refresh();
            } else {
                const err = await res.json();
                alert(err.message || 'Erro ao redefinir senha.');
            }
        } catch (err) {
            alert('Erro de rede.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este administrador definitivamente?')) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                router.refresh();
            } else {
                const err = await res.json();
                alert(err.message || 'Erro ao excluir.');
            }
        } catch (err) {
            alert('Erro de rede.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-0 animate-in fade-in duration-500">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse relative">
                        <thead className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md">
                            <tr className="border-b border-slate-100">
                                <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Identidade</th>
                                <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Credenciais</th>
                                <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-center">Nível de Segurança</th>
                                <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-right">Controles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {users.map((user) => {
                                const isMe = user.id === currentUserId;
                                return (
                                    <tr key={user.id} className="hover:bg-rose-50/20 transition-all group">
                                        <td className="p-5 px-8">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-inner border transition-all ${
                                                    isMe ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-400 group-hover:border-rose-400 group-hover:text-rose-600'
                                                }`}>
                                                    <Fingerprint size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2 uppercase tracking-tight">
                                                        {user.name} 
                                                        {isMe && <span className="text-[9px] bg-slate-900 text-white px-2 py-0.5 rounded-lg uppercase tracking-widest shadow-lg shadow-slate-200">Session User</span>}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-60">ID: {user.id.split('-')[0]}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 px-8">
                                            <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm">
                                                <Mail size={14} className="text-slate-300" />
                                                {user.email}
                                            </div>
                                        </td>
                                        <td className="p-5 px-8 text-center">
                                            {user.forcePasswordChange ? (
                                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-amber-50 text-amber-600 border-amber-200 text-[9px] font-black uppercase tracking-widest animate-pulse">
                                                    <AlertTriangle size={12} />
                                                    Troca de Senha Exigida
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-200 text-[9px] font-black uppercase tracking-widest">
                                                    <CheckCircle2 size={12} />
                                                    Padrão de Segurança OK
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-5 px-8 text-right">
                                            <div className="flex items-center justify-end gap-2 text-nowrap">
                                                <button 
                                                    onClick={() => openEditModal(user)} 
                                                    className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                                                    title="Editar Perfil"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => handleResetPassword(user.id, user.email)} 
                                                    className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all shadow-sm"
                                                    title="Resetar Senha"
                                                >
                                                    <RefreshCcw size={14} />
                                                </button>
                                                {!isMe && (
                                                    <button 
                                                        onClick={() => handleDelete(user.id)} 
                                                        className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all shadow-sm"
                                                        title="Revogar Acesso"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-24 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-40">
                                            <User size={48} className="text-slate-200" />
                                            <p className="text-slate-800 font-bold uppercase tracking-widest text-xs">Administrador ausente no sistema</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 bg-slate-50/30 border-t border-slate-100 shrink-0">
                    <Pagination currentPage={currentPage} totalPages={totalPages} totalResults={totalResults} />
                </div>
            </div>

            {/* Modal de Criação / Edição */}
            {modalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setModalOpen(false)} />
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl relative z-10 animate-in zoom-in-95 duration-300 border border-white">
                        <header className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-lg shadow-rose-100">
                                    {editingUser ? <Edit2 size={24} /> : <Plus size={24} />}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                                        {editingUser ? 'Ajustar Perfil' : 'Novo Administrador'}
                                    </h2>
                                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-0.5">Gestão de Autoridade</p>
                                </div>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="p-2.5 bg-slate-100 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all">
                                <X size={20} />
                            </button>
                        </header>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Assinatura do Usuário</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors">
                                        <User size={16} />
                                    </div>
                                    <input 
                                        type="text" 
                                        required 
                                        value={name} 
                                        onChange={e => setName(e.target.value)} 
                                        className="w-full bg-slate-50 border border-slate-100 text-slate-900 pl-11 pr-4 py-4 rounded-2xl focus:outline-none focus:border-rose-500 focus:bg-white transition-all text-sm font-bold placeholder:text-slate-300 shadow-inner" 
                                        placeholder="Nome completo do administrador" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">E-mail de Acesso Corporativo</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors">
                                        <Mail size={16} />
                                    </div>
                                    <input 
                                        type="email" 
                                        required 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)} 
                                        className="w-full bg-slate-50 border border-slate-100 text-slate-900 pl-11 pr-4 py-4 rounded-2xl focus:outline-none focus:border-rose-500 focus:bg-white transition-all text-sm font-bold placeholder:text-slate-300 shadow-inner" 
                                        placeholder="exemplo@praia.com.br" 
                                    />
                                </div>
                            </div>

                            {!editingUser && (
                                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-4">
                                    <div className="shrink-0 w-8 h-8 rounded-lg bg-white flex items-center justify-center text-amber-500 shadow-sm shadow-amber-100">
                                        <Lock size={16} />
                                    </div>
                                    <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase tracking-tight">
                                        Uma <strong>senha efêmera</strong> será disparada para o e-mail informado. O usuário deverá renová-la no primeiro handshake com o sistema.
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setModalOpen(false)} 
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl uppercase tracking-[0.2em] text-[10px] transition-all"
                                >
                                    Abortar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={loading} 
                                    className="flex-1 bg-slate-900 hover:bg-rose-600 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl uppercase tracking-[0.2em] text-[10px] transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                    Confirmar Dados
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <button id="trigger-new-user-modal" onClick={openNewModal} className="hidden" />
        </div>
    );
}
