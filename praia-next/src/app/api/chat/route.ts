import { NextResponse } from 'next/server';
import { generateAiConsultation } from '@/lib/gemini';

export async function POST(request: Request) {
    try {
        const { query, context } = await request.json();

        if (!query) {
            return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 });
        }

        const response = await generateAiConsultation(query, context);

        return NextResponse.json({
            success: true,
            response
        });
    } catch (error: any) {
        console.error('>>> Error in chat API:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
