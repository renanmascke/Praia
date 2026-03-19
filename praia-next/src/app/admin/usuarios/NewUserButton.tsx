'use client';

import { Plus } from 'lucide-react';

export default function NewUserButton() {
    return (
        <button
            onClick={() => {
                const trigger = document.getElementById('trigger-new-user-modal');
                if (trigger) trigger.click();
            }}
            className="bg-emerald-500 hover:bg-emerald-600 transition-all text-white px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-200 shrink-0 flex items-center gap-2 active:scale-95"
        >
            <Plus size={16} strokeWidth={3} />
            Novo Administrador
        </button>
    );
}
