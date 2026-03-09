'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SearchFilter from '../app/admin/components/SearchFilter';
import Pagination from '../app/admin/components/Pagination';

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

    // Sincronizar estado local com props do servidor (importante para busca/paginação)
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
                // Update user
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
                // Create user
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
                alert('Nova senha gerada e enviada com sucesso! O usuário será forçado a trocá-la no primeiro acesso.');
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
        if (!confirm('Excluir este administrador definitivamente? Esta ação não pode ser desfeita.')) return;

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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
                <div className="overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse relative">
                        <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                            <tr className="border-b border-slate-200">
                                <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[35%]">Usuário</th>
                                <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[35%]">E-mail de Login</th>
                                <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[15%] text-center">Status</th>
                                <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[15%] text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((user) => {
                                const isMe = user.id === currentUserId;
                                return (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-2.5 px-4">
                                            <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                                                {user.name} {isMe && <span className="text-[9px] bg-slate-800 text-white px-2 py-0.5 rounded uppercase tracking-widest">Você</span>}
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">ID: {user.id.split('-')[0]}</div>
                                        </td>
                                        <td className="p-2.5 px-4">
                                            <span className="text-xs font-semibold text-slate-600">{user.email}</span>
                                        </td>
                                        <td className="p-2.5 px-4 text-center">
                                            {user.forcePasswordChange ? (
                                                <span className="px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest rounded-full border bg-amber-50 text-amber-600 border-amber-200">
                                                    Troca Pendente
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest rounded-full border bg-emerald-50 text-emerald-600 border-emerald-200">
                                                    Ativo / Seguro
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-2.5 px-4 text-right space-x-3 text-nowrap">
                                            <button onClick={() => openEditModal(user)} className="text-[9px] font-bold uppercase tracking-widest text-sky-500 hover:text-sky-700 transition-colors">
                                                Editar
                                            </button>
                                            <button onClick={() => handleResetPassword(user.id, user.email)} className="text-[9px] font-bold uppercase tracking-widest text-amber-500 hover:text-amber-700 transition-colors">
                                                Reset
                                            </button>
                                            {!isMe && (
                                                <button onClick={() => handleDelete(user.id)} className="text-[9px] font-bold uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-colors">
                                                    Excluir
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {users.length === 0 && (
                                <tr><td colSpan={4} className="p-10 text-center text-slate-500 text-sm italic">Nenhum administrador encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="shrink-0">
                    <Pagination currentPage={currentPage} totalPages={totalPages} totalResults={totalResults} />
                </div>
            </div>

            {/* Modal de Criação / Edição */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
                        <button onClick={() => setModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500 transition-colors">
                            ✕
                        </button>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6 flex items-center gap-2">
                            {editingUser ? '✎ Editar Administrador' : '+ Criar Administrador'}
                        </h2>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Nome Completo</label>
                                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-sm" placeholder="Ex: Felipe Santos" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">E-mail (Usado no Login)</label>
                                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-sm" placeholder="felipe@praia.com.br" />
                            </div>

                            {!editingUser && (
                                <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-xl text-xs flex mt-4">
                                    <span className="mr-2">⚠️</span>
                                    <p>Uma <strong>senha temporária</strong> única será enviada para este e-mail. Ele será forçado a trocá-la no primeiro acesso por segurança.</p>
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-xl uppercase tracking-widest text-xs transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={loading} className="flex-1 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95">
                                    {loading ? 'Salvando...' : 'Salvar Dados'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Imperative Trigger (Hidden) */}
            <button id="trigger-new-user-modal" onClick={openNewModal} className="hidden" />
        </div>
    );
}

