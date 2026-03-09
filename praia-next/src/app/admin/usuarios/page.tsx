import prisma from '@/lib/prisma';
import UsersClient from '@/components/UsersClient';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import NewUserButton from './NewUserButton';
import SearchFilter from '@/app/admin/components/SearchFilter';

export default async function AdminUsersPage({
    searchParams,
}: {
    searchParams: { page?: string; search?: string };
}) {
    const page = parseInt(searchParams.page || '1');
    const search = searchParams.search || '';
    const pageSize = 25;

    const where: Prisma.UserWhereInput = search
        ? {
            OR: [
                { name: { contains: search } },
                { email: { contains: search } },
            ],
        }
        : {};

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: { id: true, name: true, email: true, forcePasswordChange: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    const token = cookies().get('adminSession')?.value;
    const verified: any = token ? await verifyJWT(token) : null;
    const currentUserId = verified?.id;

    return (
        <div className="animate-in fade-in duration-500 flex-1 flex flex-col min-h-0">
            <header className="mb-4 flex flex-col md:flex-row justify-between items-center flex-wrap gap-4 shrink-0">
                <div className="flex-1 min-w-[300px]">
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-1 flex items-center gap-3">
                        <span className="text-rose-500">🛡️</span> Administradores
                    </h1>
                    <p className="text-slate-500 font-medium text-sm">Gerencie o acesso ao painel. Crie novas senhas pro ativamento forçado via E-mail.</p>
                </div>
                <div className="flex items-center gap-4 flex-1 md:flex-initial md:w-[400px]">
                    <SearchFilter placeholder="Buscar por e-mail ou nome..." className="relative w-full" />
                    <NewUserButton />
                </div>
            </header>

            {/* Tabela Interativa de Usuários com Componente Client Side */}
            <UsersClient
                initialUsers={users}
                currentUserId={currentUserId}
                currentPage={page}
                totalPages={totalPages}
                totalResults={total}
            />
        </div>
    );
}
