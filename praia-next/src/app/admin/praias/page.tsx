import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import BeachesClient from './BeachesClient';

export default async function AdminPraiasPage({
    searchParams,
}: {
    searchParams: { page?: string; search?: string };
}) {
    const page = parseInt(searchParams.page || '1');
    const search = searchParams.search || '';
    const pageSize = 25;

    const where: Prisma.BeachWhereInput = search
        ? {
            OR: [
                { name: { contains: search } },
                { city: { name: { contains: search } } }
            ]
        }
        : {};

    const [beaches, total, windDirections] = await Promise.all([
        prisma.beach.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                city: true,
                anchor: {
                    include: { city: true }
                },
                _count: {
                    select: { reports: true }
                }
            },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.beach.count({ where }),
        prisma.$queryRaw<any[]>`SELECT * FROM WindDirection`
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return (
        <BeachesClient
            beaches={beaches}
            windDirections={windDirections}
            total={total}
            totalPages={totalPages}
            page={page}
        />
    );
}

