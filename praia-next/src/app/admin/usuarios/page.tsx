import prisma from '@/lib/prisma';
import UsersClient from '@/components/UsersClient';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import NewUserButton from './NewUserButton';
import SearchFilter from '@/app/admin/components/SearchFilter';
import { Shield, ShieldAlert, Search, PlusCircle } from 'lucide-react';

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
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-200">
                            <Shield size={20} />
                        </div>
                        Gestão de Administradores
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm">Controle de acessos, privilégios e auditoria de segurança do painel.</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-[350px] group">
                        <SearchFilter placeholder="Buscar por e-mail ou nome..." className="w-full" />
                    </div>
                    <NewUserButton />
                </div>
            </div>

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
