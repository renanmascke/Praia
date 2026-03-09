import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = 'force-dynamic';

export async function GET() {
    const diagnostics: any = {
        geminiKeyPresent: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        geminiKeyStart: process.env.GOOGLE_GENERATIVE_AI_API_KEY ? `${process.env.GOOGLE_GENERATIVE_AI_API_KEY.substring(0, 10)}...` : 'N/A',
        time: new Date().toISOString(),
        variantResults: []
    };

    if (!diagnostics.geminiKeyPresent) {
        return NextResponse.json({ success: false, message: "Variável GOOGLE_GENERATIVE_AI_API_KEY não encontrada.", diagnostics });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

        // Diagnóstico: Testar variantes de modelos
        const modelVariants = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-1.5-flash-001",
            "gemini-1.5-flash-002",
            "gemini-2.0-flash",
            "gemini-2.0-flash-exp",
            "gemini-2.0-flash-lite",
            "gemini-1.5-flash-8b",
            "gemini-1.5-flash-8b-latest",
            "gemini-pro"
        ];

        const variantResults: any[] = [];

        for (const modelName of modelVariants) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                // Usar um prompt simples para economizar tokens
                const result = await model.generateContent("Diga 'OK'");
                variantResults.push({ model: modelName, status: "SUCCESS", response: result.response.text() });
            } catch (err: any) {
                variantResults.push({ model: modelName, status: "FAILED", error: err.message });
            }
        }

        diagnostics.variantResults = variantResults;

        const successVariant = variantResults.find(v => v.status === "SUCCESS");

        return NextResponse.json({
            success: !!successVariant,
            message: successVariant ? `Sucesso com o modelo ${successVariant.model}` : "Nenhum modelo funcionou. Verifique 'variantResults' nos diagnósticos.",
            diagnostics
        });
    } catch (error: any) {
        console.error(">>> ERRO NO TESTE GEMINI:", error.message);
        return NextResponse.json({
            success: false,
            message: "Falha na conectividade com Gemini",
            error: error.message,
            diagnostics
        }, { status: 500 });
    }
}
