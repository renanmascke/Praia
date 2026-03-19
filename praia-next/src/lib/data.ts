export interface BeachWhitelistItem {
    target: string;
    region: string;
    keys: string[];
    not?: string[];
    idealWind: string;
    offlineDesc: string;
}

export const beachWhitelist: BeachWhitelistItem[] = [
    { target: "Cachoeira do Bom Jesus", region: "North", keys: ["CACHOEIRA"], idealWind: "S, SW, SE", offlineDesc: "Águas quentes e mansas, excelente para famílias." },
    { target: "Cacupé", region: "North", keys: ["CACUPE"], idealWind: "E, SE, NE", offlineDesc: "Pôr do sol deslumbrante na costa abrigada." },
    { target: "Canasvieiras", region: "North", keys: ["CANASVIEIRAS"], idealWind: "S, SW, SE", offlineDesc: "Centro vibrante do Norte com mar piscininha." },
    { target: "Daniela", region: "North", keys: ["DANIELA"], idealWind: "S, SW, SE, E", offlineDesc: "Mar raso e sem ondas, um verdadeiro refúgio calmo." },
    { target: "Ingleses", region: "North/Exposed", keys: ["INGLESES"], idealWind: "S, SW, W", offlineDesc: "Extensa faixa de areia com dunas e infraestrutura rica." },
    { target: "Jurerê Internacional", region: "North", keys: ["INTERNACIONAL"], idealWind: "S, SW, SE", offlineDesc: "Luxo, festas e mar calmo num balneário planejado." },
    { target: "Jurerê", region: "North", keys: ["JURERE"], not: ["INTERNACIONAL"], idealWind: "S, SW, SE", offlineDesc: "Águas serenas com um ar familiar e tranquilo." },
    { target: "Lagoinha", region: "North", keys: ["LAGOINHA"], not: ["LESTE", "CONCEICAO"], idealWind: "S, SW", offlineDesc: "Baía abrigada cristalina, ótima para banho." },
    { target: "Ponta das Canas", region: "North", keys: ["PONTA DAS CANAS"], idealWind: "S, SW, SE", offlineDesc: "Colônia mansa na ponta mais ao norte da ilha." },
    { target: "Praia Brava", region: "North/Exposed", keys: ["BRAVA"], idealWind: "S, SW, W", offlineDesc: "Ondas fortes, visual selvagem e reduto de surfistas." },
    { target: "Praia do Forte", region: "North", keys: ["FORTE"], idealWind: "S, SW, SE", offlineDesc: "Tranquilidade e história ao lado da fortaleza e do mar calmo." },
    { target: "Praia do Santinho", region: "North/Exposed", keys: ["SANTINHO"], idealWind: "S, SW", offlineDesc: "Inscrições rupestres, dunas e mar agitado." },
    { target: "Sambaqui", region: "North", keys: ["SAMBAQUI"], idealWind: "E, SE, NE", offlineDesc: "Rota gastronômica açoriana voltada pro sol poente." },
    { target: "Santo Antônio de Lisboa", region: "North", keys: ["ANTONIO DE LISBOA"], idealWind: "E, SE, NE", offlineDesc: "História, ostras e o pôr do sol clássico da Baía Norte." },

    { target: "Barra da Lagoa", region: "East", keys: ["BARRA DA LAGOA"], not: ["PRAINHA"], idealWind: "S, SW, W", offlineDesc: "Vila pesqueira charmosa e canal de águas brandas." },
    { target: "Praia da Galheta", region: "East/Exposed", keys: ["GALHETA"], idealWind: "W, SW", offlineDesc: "Natureza intocada e naturismo opcional." },
    { target: "Lagoa da Conceição", region: "East", keys: ["LAGOA DA CONCEICAO"], idealWind: "N, NE, S", offlineDesc: "Cartão postal, point de esportes náuticos e vida noturna." },
    { target: "Praia da Joaquina", region: "East/Exposed", keys: ["JOAQUINA"], idealWind: "NW, W, SW", offlineDesc: "Dunas clássicas e ondas famosas pro surf." },
    { target: "Praia do Gravatá", region: "East", keys: ["GRAVATA"], idealWind: "W, SW", offlineDesc: "Paraíso escondido acessível por trilha litorânea." },
    { target: "Praia do Moçambique", region: "East/Exposed", keys: ["MOCAMBIQUE"], idealWind: "W, SW, NW", offlineDesc: "A maior da ilha, isolada pelo parque florestal." },
    { target: "Praia Mole", region: "East/Exposed", keys: ["MOLE"], idealWind: "W, SW, NW", offlineDesc: "Point jovem, dunas e mar de tombo desafiador." },
    { target: "Prainha da Barra da Lagoa", region: "East", keys: ["PRAINHA", "BARRA"], idealWind: "S, SW, W", offlineDesc: "Canto íntimo de mar calmo atravessando a passarela." },

    { target: "Praia da Lagoinha do Leste", region: "South/Exposed", keys: ["LAGOINHA DO LESTE"], idealWind: "N, NW", offlineDesc: "Paraíso absoluto alcançável via trilha ou barco." },
    { target: "Praia do Morro das Pedras", region: "South/Exposed", keys: ["MORRO DAS PEDRAS"], idealWind: "N, NW, W", offlineDesc: "Mar furioso estourando nas rochas do mirante." },
    { target: "Praia do Pântano do Sul", region: "South", keys: ["PANTANO DO SUL"], not: ["ARMACAO"], idealWind: "N, NE", offlineDesc: "Tradicional vila de pescadores de vasta gastronomia." },
    { target: "Praia dos Açores", region: "South/Exposed", keys: ["ACORES"], idealWind: "N, NW", offlineDesc: "Mar aberto, areia branca e tranquilidade residencial." },
    { target: "Praia da Armação", region: "South/Exposed", keys: ["ARMACAO"], idealWind: "N, NW, W", offlineDesc: "Baleias, barcos lúdicos e mar propício aos surfistas." },
    { target: "Praia da Solidão", region: "South/Exposed", keys: ["SOLIDAO"], idealWind: "N, NW", offlineDesc: "Refúgio verde com cachoeira escondida e paz." },
    { target: "Praia do Campeche", region: "South/Exposed", keys: ["CAMPECHE"], idealWind: "N, NW, W", offlineDesc: "Mar aberto esmeralda frente à cobiçada Ilha do Campeche." },
    { target: "Praia do Saquinho", region: "South/Exposed", keys: ["SAQUINHO"], idealWind: "N, NW", offlineDesc: "Intocada e mística, trilha pelo costão com belas vistas." },
    { target: "Praia do Matadeiro", region: "South/Exposed", keys: ["MATAD"], idealWind: "N, NE", offlineDesc: "Acesso puramente por trilha, vibe surf e natureza pura." },
    { target: "Praia de Naufragados", region: "South/Exposed", keys: ["NAUFRAGADOS"], idealWind: "NE, E", offlineDesc: "Extremo sul selvagem contendo ruínas e farol histórico." },
    { target: "Ribeirão da Ilha", region: "South", keys: ["RIBEIRAO"], idealWind: "E, SE, NE", offlineDesc: "Casarões coloniais e a capital nacional da Ostra." },
    { target: "Tapera", region: "South", keys: ["TAPERA"], idealWind: "E, SE, NE", offlineDesc: "Águas muito calmas viradas para a baía sul continental." }
];

export const windTranslator: Record<string, string> = {
    "N": "Norte", "S": "Sul", "E": "Leste", "W": "Oeste",
    "NE": "Nordeste", "NW": "Noroeste", "SE": "Sudeste", "SW": "Sudoeste",
    "NNE": "Norte-Nordeste", "ENE": "Leste-Nordeste", "ESE": "Leste-Sudeste", "SSE": "Sul-Sudeste",
    "SSW": "Sul-Sudoeste", "WSW": "Oeste-Sudoeste", "WNW": "Oeste-Noroeste", "NNW": "Norte-Noroeste"
};
