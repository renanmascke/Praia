import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getBrazilToday } from '@/lib/date-utils';
import { generateDailyRankings, triggerGlobalRankingUpdate } from '@/lib/ranking';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log(">>> RECALCULO DE RANKING MANUAL INICIADO <<<");

    try {
        await triggerGlobalRankingUpdate();
        return NextResponse.json({ success: true, message: 'Ranking recalculado com sucesso!' });
    } catch (error: any) {
        console.error('Erro no recalculo manual do ranking:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
