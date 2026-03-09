// Funções de Interface Declaradas Primeiro

function setSkeleton(id, isLoading) {
    const el = document.getElementById(id);
    if (!el) return;
    if (isLoading) {
        el.classList.add('skeleton');
        if (id !== 'ranking-container') el.style.minHeight = '14px';
    } else {
        el.classList.remove('skeleton');
        el.style.minHeight = 'auto';
    }
}

function updateModularLoading(isLoading) {
    ['current-date-label', 'verdict-text', 'verdict-desc-el', 'wind-dir-display', 'wind-speed-display', 'sea-size-display', 'ranking-container'].forEach(id => setSkeleton(id, isLoading));
    if (isLoading) {
        document.getElementById('ranking-best').innerHTML = '';
        document.getElementById('ranking-worst').innerHTML = '';
        if (currentChart) currentChart.destroy();
    }
}

function formatMarkdown(text) {
    if (!text) return "";
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^\s*[\*•-]\s+/gm, '• ')
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>');
}

// --- DADOS E LÓGICA ---

let forecastData = {};
for (let i = 1; i <= 7; i++) {
    forecastData[`dia${i}`] = {
        ready: false, label: "", fullDate: "", verdict: "...", desc: "...", theme: "slate",
        iconUrl: "", wind: { dir: "--", dirFull: "--", speed: "--" }, sea: "--", hourly: [], chart: { temp: [], rain: [], wind: [] },
        rainDetails: { chance: 0, amount: 0, peakHour: null, rainWindow: null }
    };
}

let listBeaches = [];

let currentChart = null;
let activeKey = 'dia1';
let rankingExpanded = false;

async function callGemini(prompt, systemInstruction = "") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] }
    };
    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (e) { return ""; }
}

function getFullRanking(dirVento) {
    const d = String(dirVento || "NE").toUpperCase();
    const scoredList = listBeaches.map((p, i) => {
        let weatherScore = 72; // Classe padrão
        const r = p.region || "";

        // Regras de vento baseadas na região (agora dinâmica via IA)
        if (d.includes('N')) {
            if (r.includes('Exposed')) weatherScore -= 45;
            if (r.includes('Sheltered')) weatherScore += 15;
            if (r.includes('North')) weatherScore -= 20; // Vento norte estraga praias do Norte
        } else if (d.includes('S')) {
            if (r.includes('Exposed')) weatherScore -= 55;
            if (r.includes('North')) weatherScore += 20; // Vento sul limpa o Norte
            if (r.includes('South')) weatherScore -= 20;
        } else if (d.includes('E')) {
            if (r.includes('East')) weatherScore -= 40; // Vento leste forte nas praias de leste
        }

        const swimmabilityFactor = p.pts > 0 ? (p.pPts / p.pts) : 1;
        const swimmabilityScore = swimmabilityFactor * 100;
        let finalScore = (weatherScore * 0.7) + (swimmabilityScore * 0.3);

        // Prioridade Sanitária: Apenas praias confirmadamente 100% IMPRÓPRIAS vão para o fim do ranking
        if (p.pts > 0 && p.pPts === 0) finalScore = 5 + (i % 5);
        if (finalScore > 98) finalScore = 98;
        if (finalScore < 0) finalScore = 0;
        return { ...p, score: Math.round(finalScore) };
    });

    const sortedAll = scoredList.sort((a, b) => b.score - a.score);
    sortedAll.forEach((p, i) => p.globalRank = i + 1);

    const half = Math.ceil(sortedAll.length / 2);
    return {
        best: sortedAll.slice(0, half),
        worst: sortedAll.slice(half).sort((a, b) => (a.score - b.score) || (b.globalRank - a.globalRank)) // Pior p/ melhor com desempate preservando ordem limpa
    };
}

async function updateExpertAnalysis(key) {
    const data = forecastData[key];
    const textEl = document.getElementById('ai-insight-text');
    if (!textEl || !data.ready || listBeaches.length === 0) return;

    setSkeleton('ai-insight-text', true);
    const ranking = getFullRanking(data.wind.dir);
    const topBeaches = ranking.best.slice(0, 5).map(p => p.name).join(', ');
    let rainAlert = data.rainDetails.rainWindow ? `ALERTA CHUVA: Prevista das **${data.rainDetails.rainWindow}** (${data.rainDetails.chance}% / **${data.rainDetails.amount}mm**). NÃO ir à praia nesses horários.` : "";

    const prompt = `RESUMO EXECUTIVO FLORIPA ${data.fullDate}: Condição: ${data.desc}. Vento: ${data.wind.dirFull}. ${rainAlert} UNIFORMIDADE: Sugira as melhores opções do ranking: **${topBeaches}**. REQUISITOS: 1. NUNCA sugira locais impróprios pelo IMA. 2. Se houver chuva, cite a janela e desaconselhe o banho. 3. Direto, técnico, sem saudações. Texto entre 5 e 6 linhas. USE obrigatoriamente **asteriscos duplos para negrito** para destacar nomes e dados críticos.`;

    const result = await callGemini(prompt, "Especialista técnico em segurança e balneabilidade.");
    textEl.innerHTML = formatMarkdown(result || "O dia está ótimo para aproveitar as praias protegidas.");
    setSkeleton('ai-insight-text', false);
}

function updateUI(key) {
    activeKey = key;
    const data = forecastData[key];
    document.querySelectorAll('.date-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.key === key));

    if (!data.ready || listBeaches.length === 0) return updateModularLoading(true);
    updateModularLoading(false);

    document.getElementById('current-date-label').textContent = data.fullDate;
    const vText = document.getElementById('verdict-text');
    vText.innerHTML = `<img src="${data.iconUrl}" class="w-10 h-10 inline-block mr-1 align-middle"> <span class="text-${data.theme}-600">${data.verdict}</span>`;
    document.getElementById('verdict-desc-el').textContent = data.desc;
    document.getElementById('section-verdict').className = `p-8 text-center border-b border-slate-100 bg-${data.theme}-50/20 transition-all duration-700`;

    document.getElementById('wind-dir-display').textContent = `(${data.wind.dir}) ${data.wind.dirFull}`;
    document.getElementById('wind-speed-display').textContent = data.wind.speed;
    document.getElementById('sea-size-display').textContent = `Mar: ${data.sea}m`;

    const ranking = getFullRanking(data.wind.dir);
    const bestCont = document.getElementById('ranking-best');
    const worstCont = document.getElementById('ranking-worst');
    bestCont.innerHTML = ''; worstCont.innerHTML = '';

    const populate = (container, list, color) => {
        list.forEach((p, i) => {
            const isExtra = i >= 5;
            const div = document.createElement('div');
            div.className = `beach-item flex items-start justify-between border-b border-slate-100 pb-2 last:border-0 pt-1 px-2 rounded-md ${isExtra ? 'ranking-extra' : ''} ${isExtra && !rankingExpanded ? 'is-hidden' : ''}`;
            div.innerHTML = `<div class="flex-grow"><h5 class="text-[11px] font-bold text-slate-800 uppercase mb-0.5 leading-none"><span class="text-${color}-600 mr-1">#${p.globalRank}</span> ${p.name}</h5><p class="text-[10px] text-slate-400 leading-tight">${p.desc}</p></div><div class="text-right min-w-[50px] ml-4"><span class="text-[10px] font-black text-${color}-600">${p.score}%</span><div class="w-14 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden"><div class="bg-${color}-500 h-full transition-all duration-1000" style="width: ${p.score}%"></div></div></div>`;
            container.appendChild(div);
        });
    };

    populate(bestCont, ranking.best, 'emerald');
    populate(worstCont, ranking.worst, 'rose');

    const beachList = document.getElementById('beach-list');
    beachList.innerHTML = '';
    ranking.best.slice(0, 5).forEach(b => {
        const tag = document.createElement('span');
        tag.className = "bg-white px-3 py-1.5 rounded-md text-[10px] font-bold text-sky-600 border border-slate-200 shadow-sm uppercase";
        tag.textContent = b.name;
        beachList.appendChild(tag);
    });

    const ctx = document.getElementById('weatherChart').getContext('2d');
    if (currentChart) currentChart.destroy();
    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ["00h", "03h", "06h", "09h", "12h", "15h", "18h", "21h"],
            datasets: [
                { label: 'Temperatura (°C)', data: data.chart.temp, borderColor: '#f59e0b', borderWidth: 3, tension: 0.4, yAxisID: 'y' },
                { label: 'Vento (km/h)', data: data.chart.wind, borderColor: '#0ea5e9', borderWidth: 2, borderDash: [5, 5], tension: 0.3, yAxisID: 'y2' },
                { label: 'Chuva (mm)', data: data.chart.rain, type: 'bar', backgroundColor: 'rgba(14, 165, 233, 0.2)', yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw}${c.datasetIndex === 0 ? '°C' : (c.datasetIndex === 1 ? 'km/h' : 'mm')}` } } },
            scales: {
                y: { min: 10, max: 40, ticks: { callback: (v) => v + '°C', font: { size: 9 } } },
                y1: { position: 'right', min: 0, max: 20, grid: { display: false }, ticks: { callback: (v) => v + 'mm', font: { size: 9 } } },
                y2: { position: 'right', min: 0, max: 50, grid: { display: false }, ticks: { callback: (v) => v + 'km/h', font: { size: 9 } } }
            }
        }
    });
    updateExpertAnalysis(key);
}

async function syncWithIMAAPI() {
    try {
        const targetUrl = 'https://balneabilidade.ima.sc.gov.br/relatorio/relatorioBalneabildade';
        const urlsRaw = [
            'proxy.php',                                                             // Proxy PHP próprio (servidor → servidor, zero CORS)
            `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,   // Fallback público 1
            `https://thingproxy.freeboard.io/fetch/${targetUrl}`,                    // Fallback público 2
            `https://api.codetabs.com/v1/proxy?quest=${targetUrl}`,                  // Fallback público 3
            targetUrl                                                                // Último recurso: acesso direto
        ];
        let htmlString = null;

        for (let url of urlsRaw) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8500); // 8.5 sec timeout. Gov servers can be slow.

                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                    htmlString = await response.text();
                    break;
                }
            } catch (e) {
                console.warn(`Proxy/Link falhou ou deu timeout: ${url}`);
            }
        }

        if (!htmlString || !htmlString.includes('<table')) {
            throw new Error("Falha no CORS ou página do IMA fora do ar no momento.");
        }

        // Fazer parser do HTML retornado pela nova rota
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        // Localização robusta da seção de Florianópolis no HTML do IMA
        let linhasTabela = [];
        const content = doc.body;

        // Encontra todos os elementos que podem ser cabeçalhos de cidade
        const headers = Array.from(content.querySelectorAll('h1, h2, h3, font, b, div, strong'));
        const floripaHeader = headers.find(h =>
            h.textContent.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().includes("FLORIANOPOLIS")
        );

        if (floripaHeader) {
            let current = floripaHeader.nextElementSibling;
            // Percorre os irmãos até achar a próxima cidade ou o fim
            while (current) {
                // Se achou outra cidade, para (Geralmente são textos em CAIXA ALTA)
                const txt = current.textContent.trim();
                if (current.tagName.match(/H[1-6]/) || (txt.length > 3 && txt === txt.toUpperCase() && !txt.includes("PONTO"))) {
                    if (linhasTabela.length > 0) break; // Já pegamos as tabelas de Floripa
                }

                if (current.classList.contains('table-print')) {
                    const rows = current.querySelectorAll('tbody tr');
                    linhasTabela = [...linhasTabela, ...rows];
                }

                // Se a tabela estiver dentro de um div
                const innerTable = current.querySelector('.table-print');
                if (innerTable) {
                    const rows = innerTable.querySelectorAll('tbody tr');
                    linhasTabela = [...linhasTabela, ...rows];
                }

                current = current.nextElementSibling;
            }
        }

        // Caso a lógica de seções falhe (mudança de layout), usamos o seletor universal como último recurso
        if (linhasTabela.length === 0) {
            linhasTabela = doc.querySelectorAll('.table-print tbody tr');
        }

        // Pré-popula as 34 praias na base para não sumirem se o IMA não tiver dados hoje
        const balnearios = {};
        beachWhitelist.forEach(bw => {
            balnearios[bw.target] = {
                name: bw.target,
                region: bw.region,
                idealWind: bw.idealWind,
                pts: 0, pPts: 0, improprios: 0, indeterminados: 0
            };
        });

        // Agrupar os pontos pelo nome do Balneário com filtro de whitelist iterando o HTML
        linhasTabela.forEach(tr => {
            const localTd = tr.querySelector('.local');
            const situacaoImg = tr.querySelector('.situacao img');

            if (!localTd || !situacaoImg) return;

            // Pegamos APENAS o texto em negrito (nome da praia) para evitar match com o endereço
            const nomeB = localTd.querySelector('b');
            if (!nomeB) return;

            const bName = nomeB.textContent.trim();
            const cleanObjName = bName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

            const match = beachWhitelist.find(bw => {
                const hasKeys = bw.keys.every(k => cleanObjName.includes(k));
                const noExcludes = bw.not ? !bw.not.some(n => cleanObjName.includes(n)) : true;
                return hasKeys && noExcludes;
            });

            if (!match) return; // Fora da whitelist

            // Atualiza os dados do balneário pré-existente
            if (balnearios[match.target]) {
                balnearios[match.target].pts++;

                const imgSrc = situacaoImg.getAttribute('src') || "";

                if (imgSrc.toLowerCase().includes("impropria.png")) {
                    balnearios[match.target].improprios++;
                } else if (imgSrc.toLowerCase().includes("propria.png")) {
                    balnearios[match.target].pPts++;
                } else {
                    balnearios[match.target].indeterminados++;
                }
            }
        });

        listBeaches = Object.values(balnearios).map(b => {
            return {
                name: b.name,
                region: b.region,
                idealWind: b.idealWind,
                pts: b.pts,
                pPts: b.pPts,
                improprios: b.improprios || 0,
                indeterminados: b.indeterminados || 0,
                desc: "Carregando..."
            };
        });

        // Chamada p/ Gemini simplificada mas consciente dos ventos
        const currWind = forecastData[activeKey]?.wind?.dirFull || "Indisponível";
        let textPrompt = `Gere descrições curtas e luxuosas para o JSON de saída cruzando com o clima atual (Vento hoje: ${currWind}).
Formato exato: { "NomeDaPraia": { "desc": "Sua descrição luxuosa considerando vento ideal. 8 a 10 palavras." } }
PRAIAS E SEUS VENTOS IDEAIS: `;
        textPrompt += listBeaches.map(b => `${b.name} (Vento ideal p/ ela: ${b.idealWind})`).join("; ");

        try {
            const geminiDesc = await callGemini(textPrompt, "Retorne estritamente JSON. Especialista local.");
            const cleanJson = geminiDesc.replace(/```json/g, '').replace(/```/g, '').trim();
            const aiData = JSON.parse(cleanJson);

            listBeaches = listBeaches.map(b => {
                const aiItem = aiData[b.name] || {};
                let aiText = aiItem.desc || "Refúgio de belezas naturais e lazer garantido.";

                let finalDesc = "";

                // Sem laudo do IMA
                // Sem laudo do IMA - Trata como alerta amarelo e pontua bem no ranking
                if (b.pts === 0) {
                    finalDesc = `<span class="text-amber-600 font-bold bg-amber-50 px-1 rounded">⚠️ SEM LAUDO</span>`;
                }
                // Mistas
                else if (b.pts > 0 && b.improprios > 0 && b.improprios < b.pts) {
                    b.pPts = Math.max(1, b.pPts); // Mantém no jogo mas avisa
                    finalDesc = `<span class="text-amber-600 font-bold bg-amber-50 px-1 rounded">⚠️ ${b.pPts} de ${b.pts} próprio(s)</span> Consulta sugerida.`;
                }
                // 100% Imprópria
                else if (b.improprios > 0 && b.improprios === b.pts) {
                    b.pPts = 0;
                    finalDesc = `<span class="text-rose-600 font-bold bg-rose-50 px-1 rounded">IMPRÓPRIA</span>`;
                }
                // 100% Própria
                else if (b.pPts === b.pts && b.pts > 0) {
                    finalDesc = `<span class="text-emerald-600 font-bold bg-emerald-50 px-1 rounded">PRÓPRIA</span>`;
                }
                // Sem dados conclusivos mas sem impróprios
                else {
                    finalDesc = `<span class="text-slate-500 font-bold bg-slate-100 px-1 rounded">📍 Indeterminado</span>`;
                }

                return { ...b, desc: `${finalDesc} ${aiText}` };
            });
        } catch (geminiError) {
            console.error("Erro ao gerar regiões/descrições com Gemini, caindo p/ fallback:", geminiError);
            listBeaches = listBeaches.map(b => {
                let finalDesc = "";
                if (b.pts === 0) {
                    finalDesc = `<span class="text-amber-600 font-bold bg-amber-50 px-1 rounded">⚠️ SEM LAUDO</span>`;
                } else if (b.pts > 0 && b.improprios > 0 && b.improprios < b.pts) {
                    finalDesc = `<span class="text-amber-600 font-bold bg-amber-50 px-1 rounded">⚠️ ${b.pPts} de ${b.pts} próprio(s)</span> Consulta sugerida.`;
                } else if (b.improprios > 0 && b.improprios === b.pts) {
                    b.pPts = 0;
                    finalDesc = `<span class="text-rose-600 font-bold bg-rose-50 px-1 rounded">IMPRÓPRIA</span>`;
                } else {
                    finalDesc = `<span class="text-emerald-600 font-bold bg-emerald-50 px-1 rounded">PRÓPRIA</span>`;
                }
                const aiDesc = "Mar agradável, ótimo para a prática de esportes e descanso.";
                return { ...b, desc: `${finalDesc} ${aiDesc}` };
            });
        }

        if (forecastData[activeKey] && forecastData[activeKey].ready) {
            updateUI(activeKey);
            updateExpertAnalysis(activeKey);
        }
    } catch (e) {
        console.warn("Aviso IMA: Bloqueio CORS ou falha detectada. Iniciando Módulo de Resgate (Offline Fallback)...", e.message);

        // Cria fallback dinâmico usando a whitelist 100% offline
        listBeaches = beachWhitelist.map(bw => ({
            name: bw.target,
            region: bw.region,
            idealWind: bw.idealWind,
            pts: 1, // Simula 100% próprio puramente pra Matemática do Ranking
            pPts: 1,
            improprios: 0,
            indeterminados: 0,
            desc: bw.offlineDesc
        }));

        if (forecastData[activeKey] && forecastData[activeKey].ready) {
            updateUI(activeKey);
            if (forecastData[activeKey].wind) updateExpertAnalysis(activeKey);
        } else {
            updateModularLoading(false);
        }
    }
}

async function syncWithWeatherAPI() {
    const city = "Florianopolis";
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${city}&days=7&aqi=no&alerts=no&lang=pt`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        data.forecast.forecastday.forEach((day, index) => {
            const key = `dia${index + 1}`;
            if (!forecastData[key]) return;
            const avgWindSpeed = Math.round(day.hour.reduce((acc, curr) => acc + curr.wind_kph, 0) / 24);
            const windDirs = day.hour.slice(6, 19).map(h => h.wind_dir);
            const predominantDir = windDirs.sort((a, b) => windDirs.filter(v => v === a).length - windDirs.filter(v => v === b).length).pop();
            let rainHours = day.hour.filter(h => h.precip_mm > 0.1);
            let rainWindow = rainHours.length > 0 ? `${rainHours[0].time.split(' ')[1]} às ${rainHours[rainHours.length - 1].time.split(' ')[1]}` : null;
            const hourlyData = day.hour.filter((h, i) => i % 3 === 0).slice(0, 8);
            forecastData[key] = {
                ...forecastData[key], ready: true, verdict: (day.day.totalprecip_mm > 5 || avgWindSpeed > 25) ? "MELHOR EVITAR" : "VÁ À PRAIA",
                theme: (day.day.totalprecip_mm > 5 || avgWindSpeed > 25) ? "rose" : "emerald", iconUrl: "https:" + day.day.condition.icon,
                desc: `${day.day.condition.text} • ${Math.round(day.day.mintemp_c)}° a ${Math.round(day.day.maxtemp_c)}° • ${avgWindSpeed}km/h`,
                hourly: day.hour, wind: { dir: predominantDir, dirFull: windTranslator[predominantDir] || predominantDir, speed: `${avgWindSpeed} km/h` },
                sea: (avgWindSpeed / 12).toFixed(1), chart: { temp: hourlyData.map(h => Math.round(h.temp_c)), rain: hourlyData.map(h => h.precip_mm), wind: hourlyData.map(h => Math.round(h.wind_kph)) },
                rainDetails: { chance: day.day.daily_chance_of_rain, amount: day.day.totalprecip_mm, rainWindow }
            };
        });
        updateUI(activeKey);
    } catch (e) { Object.keys(forecastData).forEach(k => forecastData[k].ready = true); updateUI('dia1'); }
}

function init() {

    const daysShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const now = new Date();
    const container = document.getElementById('date-selector');
    Object.keys(forecastData).forEach((k, i) => {
        let d = new Date(); d.setDate(now.getDate() + i);
        forecastData[k].fullDate = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
        const b = document.createElement('button');
        const label = i === 0 ? "Hoje" : daysShort[d.getDay()];
        const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        b.innerHTML = `<span class="block">${label}</span><span class="text-[8px] font-normal opacity-70 block -mt-0.5 leading-none">${dateStr}</span>`;
        b.dataset.key = k;
        b.className = "date-btn px-4 py-2 rounded-lg font-bold text-[10px] transition-all focus:outline-none uppercase tracking-tighter flex flex-col items-center justify-center leading-tight min-w-[65px]";
        b.onclick = () => { rankingExpanded = false; document.getElementById('btn-expand-ranking').textContent = "Ver ranking completo"; updateUI(k); };
        container.appendChild(b);
    });
    updateUI('dia1');
    syncWithWeatherAPI();
    syncWithIMAAPI();
}

document.getElementById('btn-expand-ranking').onclick = function () {
    rankingExpanded = !rankingExpanded;
    this.textContent = rankingExpanded ? "Ver apenas Top 5" : "Ver ranking completo";
    document.querySelectorAll('.ranking-extra').forEach(item => item.classList.toggle('is-hidden', !rankingExpanded));
};

async function handleAskAI() {
    const query = document.getElementById('ai-query').value.trim();
    if (!query || !geminiApiKey) return;
    const resCont = document.getElementById('ai-response-container');
    const resText = document.getElementById('ai-response-text');
    const data = forecastData[activeKey];
    const ranking = getFullRanking(data.wind.dir);
    const topBeaches = ranking.best.slice(0, 5).map(p => p.name).join(', ');
    resCont.classList.remove('hidden');
    resText.innerHTML = '<div class="h-4 w-full skeleton rounded mb-2"></div><div class="h-4 w-1/2 skeleton rounded"></div>';
    let rainAlert = data.rainDetails.rainWindow ? `CHUVA: das **${data.rainDetails.rainWindow}** (${data.rainDetails.chance}% / **${data.rainDetails.amount}mm**). NÃO ir à praia no horário.` : "";
    const prompt = `PERGUNTA: "${query}" | DADOS: ${data.desc}. ${rainAlert} | RANKING: **${topBeaches}**. INSTRUÇÕES: Padrão especialista (Técnico, 5-6 linhas, sem saudações). Priorize balneabilidade IMA. USE obrigatoriamente **asteriscos duplos para negrito** em nomes de praias e dados críticos.`;
    const ans = await callGemini(prompt, "Consultor técnico especializado.");
    resText.innerHTML = formatMarkdown(ans || "Não foi possível obter resposta agora.");
}

document.getElementById('btn-ask-ai').onclick = handleAskAI;
document.getElementById('ai-query').onkeypress = (e) => { if (e.key === 'Enter') handleAskAI(); };
window.onload = init;
