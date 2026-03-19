import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get('cityId');
    const dateStr = searchParams.get('date');
    const anchorId = searchParams.get('anchorId');

    if (!cityId || !dateStr) {
        return NextResponse.json({ success: false, error: 'City and Date are required' }, { status: 400 });
    }

    try {
        const date = new Date(dateStr + 'T00:00:00Z');

        const [rankings, citySummary] = await Promise.all([
            (prisma as any).beachRanking.findMany({
                where: {
                    date,
                    beach: {
                        cityId,
                        ...(anchorId ? { anchorId } : {})
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
            }),
            (prisma as any).cityDailySummary.findUnique({
                where: { cityId_date: { cityId, date } }
            })
        ]);

        return NextResponse.json({
            success: true,
            data: rankings,
            summary: citySummary?.content || null
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
