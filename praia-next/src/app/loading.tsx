export default function Loading() {
    return (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 animate-pulse">
            <header className="text-center mb-8 gap-2 flex flex-col items-center">
                <div className="h-8 md:h-10 bg-slate-200 rounded-lg w-3/4 max-w-md mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-48"></div>
            </header>

            {/* Tabs Skeleton */}
            <section className="mb-8 overflow-x-auto">
                <div className="flex justify-start md:justify-center min-w-max pb-2">
                    <div className="inline-flex bg-slate-200/50 rounded-xl p-1 gap-1">
                        {[...Array(7)].map((_, i) => (
                            <div key={i} className="h-9 w-16 bg-slate-200 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Hero Box Skeleton */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="p-8 text-center border-b border-slate-100 bg-slate-50">
                    <div className="h-3 bg-slate-200 rounded w-32 mx-auto mb-4"></div>
                    <div className="h-10 bg-slate-200 rounded w-64 mx-auto mb-4"></div>
                    <div className="h-4 bg-slate-200 rounded w-full max-w-md mx-auto"></div>
                </div>

                {/* Chart + Wind Skeleton */}
                <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 border-b border-slate-100">
                    <div>
                        <div className="h-5 bg-slate-200 rounded w-48 mb-6"></div>
                        <div className="h-64 bg-slate-100 rounded-xl w-full"></div>
                    </div>
                    <div>
                        <div className="h-5 bg-slate-200 rounded w-48 mb-6"></div>
                        <div className="h-32 bg-slate-100 rounded-xl w-full"></div>
                    </div>
                </div>

                {/* Ranking List Skeleton */}
                <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                        <div className="h-4 bg-slate-200 rounded w-40 mb-8"></div>
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex justify-between mb-4 border-b border-slate-100 pb-4">
                                <div>
                                    <div className="h-3 bg-slate-200 rounded w-24 mb-2"></div>
                                    <div className="h-2 bg-slate-200 rounded w-32"></div>
                                </div>
                                <div className="h-4 bg-slate-200 rounded w-8"></div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                        <div className="h-4 bg-slate-200 rounded w-40 mb-8"></div>
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex justify-between mb-4 border-b border-slate-100 pb-4">
                                <div>
                                    <div className="h-3 bg-slate-200 rounded w-24 mb-2"></div>
                                    <div className="h-2 bg-slate-200 rounded w-32"></div>
                                </div>
                                <div className="h-4 bg-slate-200 rounded w-8"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
