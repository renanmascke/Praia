
export function formatRegionLocale(regionCode: string): string {
    if (!regionCode) return '';
    const r = regionCode.toUpperCase().trim();

    // Map base directions
    const baseMap: Record<string, string> = {
        'NORTH': 'Norte da Ilha',
        'SOUTH': 'Sul da Ilha',
        'EAST': 'Leste da Ilha',
        'WEST': 'Oeste da Ilha',
        'CENTER': 'Centro / Baía',
        'CENTRO': 'Centro / Baía',
        'NORTE': 'Norte da Ilha',
        'SUL': 'Sul da Ilha',
        'LESTE': 'Leste da Ilha',
        'OESTE': 'Oeste da Ilha',
    };

    // Map suffixes (like /EXPOSED, /SHELTERED)
    const suffixMap: Record<string, string> = {
        'EXPOSED': 'Exposta',
        'SHELTERED': 'Protegida'
    };

    let result = r;
    let foundBase = false;

    // Check for combinations like "NORTH/EXPOSED"
    if (r.includes('/')) {
        const parts = r.split('/');
        const base = parts[0].trim();
        const suffix = parts[1].trim();

        const translatedBase = baseMap[base] || base;
        const translatedSuffix = suffixMap[suffix] || suffix;

        return `${translatedBase} (${translatedSuffix})`;
    }

    // Tenta encontrar um match direto ou parcial na base
    for (const key of Object.keys(baseMap)) {
        if (r === key || r.includes(key)) {
            result = baseMap[key];
            foundBase = true;
            break;
        }
    }

    return result;
}

export function formatWindLocale(windCode: string): string {
    if (!windCode) return '';
    const codes = windCode.toUpperCase().split(',').map(c => c.trim());

    const windMap: Record<string, string> = {
        "N": "Norte", "S": "Sul", "E": "Leste", "W": "Oeste",
        "NE": "Nordeste", "NW": "Noroeste", "SE": "Sudeste", "SW": "Sudoeste",
        "NNE": "Norte-Nordeste", "ENE": "Leste-Nordeste", "ESE": "Leste-Sudeste", "SSE": "Sul-Sudeste",
        "SSW": "Sul-Sudoeste", "WSW": "Oeste-Sudoeste", "WNW": "Oeste-Noroeste", "NNW": "Norte-Noroeste"
    };

    return codes.map(c => windMap[c] || c).join(', ');
}
