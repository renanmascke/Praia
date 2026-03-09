'use client';

export default function NewUserButton() {
    return (
        <button
            onClick={() => {
                const trigger = document.getElementById('trigger-new-user-modal');
                if (trigger) trigger.click();
            }}
            className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-white px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-xs shadow-md shrink-0 flex items-center gap-2"
        >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar
        </button>
    );
}
