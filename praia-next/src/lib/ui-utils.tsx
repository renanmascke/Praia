import React from 'react';

/**
 * Processa um texto com marcações de negrito (**texto**) e retorna elementos React.
 */
export function renderBoldText(text: string | null | undefined) {
    if (!text) return null;
    
    // Divide o texto por blocos de **negrito**
    // O regex captura os delimitadores para que eles fiquem no array resultante
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            // Remove os asteriscos e retorna um elemento strong com estilo extra de peso
            return (
                <strong key={i} className="font-black text-slate-800">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        return part;
    });
}
