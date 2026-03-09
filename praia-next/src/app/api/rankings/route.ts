import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get('cityId');
    const dateStr = searchParams.get('date');
    const region = searchParams.get('region');

    if (!cityId || !dateStr) {
        return NextResponse.json({ success: false, error: 'City and Date are required' }, { status: 400 });
    }

    try {
        const date = new Date(dateStr + 'T00:00:00Z');

        const rankings = await prisma.beachRanking.findMany({
            where: {
                date,
                beach: {
                    cityId,
                    ...(region ? { region } : {})
                }
            },
            include: {
                beach: {
                    select: {
                        name: true,
                        region: true
                    }
                }
            },
            orderBy: {
                position: 'asc'
            }
        });

        return NextResponse.json({ success: true, data: rankings });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
