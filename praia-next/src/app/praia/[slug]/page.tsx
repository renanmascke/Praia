import { notFound } from 'next/navigation';
import { formatWindLocale, formatRegionLocale } from '@/lib/formatters';
import prisma from '@/lib/prisma';
import Link from 'next/link';

// Helper de slugificação idêntico ao Frontend
function slugify(text: string) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, '-');
}

// Gera as rotas estáticas em Build Time (SEO Ultra Rápido)
export async function generateStaticParams() {
    const beaches = await prisma.beach.findMany();
    return beaches.map((beach) => ({
        slug: slugify(beach.name),
    }));
}

export default async function BeachPage({ params }: { params: { slug: string } }) {
    // Como são poucas dezenas de praias, carregamos todas e filtramos na RAM (ou poderíamos ter salvo o slug no Banco)
    const beaches = await prisma.beach.findMany({
        include: {
            reports: {
                orderBy: { date: 'desc' },
                take: 1
            }
        }
    });

    const beach = beaches.find(b => slugify(b.name) === params.slug);

    if (!beach) {
        notFound();
    }

    const latestReport = beach.reports[0];
    const isSafeText = latestReport?.status || 'Sem Laudo';
    const isSafe = isSafeText === 'Própria' || isSafeText === 'Sem Laudo';

    return (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-8">
                <Link href="/" className="text-sm font-bold tracking-widest uppercase text-sky-600 hover:text-sky-800 transition-colors flex items-center gap-2">
                    ← Voltar ao inDica Praia
                </Link>
            </div>

            <header className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
                    <span className="text-rose-500">🏖️</span> {beach.name}
                </h1>
                <div className="flex gap-4 mt-3 flex-wrap">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-white ${isSafe ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                        {isSafeText}
                    </span>
                    <span className="px-4 py-1.5 bg-rose-50 rounded-full text-rose-600 text-xs font-bold uppercase tracking-widest border border-rose-100">
                        Região: {formatRegionLocale(beach.region)}
                    </span>
                    <span className="px-4 py-1.5 bg-sky-50 rounded-full text-sky-600 text-xs font-bold uppercase tracking-widest border border-sky-100">
                        Vento Seco: {formatWindLocale(beach.idealWind)}
                    </span>
                </div>
            </header>

            <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 mb-8 overflow-hidden">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <span className="text-sky-500">📍</span> Sobre a Praia
                </h2>
                <p className="text-slate-600 leading-relaxed text-base">
                    {beach.offlineDesc}
                </p>
            </section>

            {/* Espaço reservado para monetização */}
            <section className="bg-amber-50/50 rounded-3xl p-8 border border-amber-200/60 relative overflow-hidden group hover:border-amber-300 transition-colors">
                <h2 className="text-lg font-bold text-amber-800 mb-2 flex items-center gap-2 uppercase tracking-wider relative z-10">
                    <span className="text-amber-500">🍽️</span> Partners & Serviços Locais
                </h2>
                <p className="text-amber-700/80 leading-relaxed max-w-2xl relative z-10 mb-6 text-sm">
                    Esta área está reservada para parceiros comerciais locais. Encontre os melhores restaurantes, quiosques, aluguéis de guarda-sol e passeios disponíveis na orla de <strong>{beach.name}</strong>.
                </p>
                <button className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-colors relative z-10 shadow-sm">
                    Anuncie sua empresa aqui
                </button>
                <div className="absolute -right-8 -bottom-8 text-8xl opacity-10 filter blur-[2px] transform group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                    🌴
                </div>
            </section>
        </main>
    );
}
