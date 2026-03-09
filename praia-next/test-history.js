const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('ima-full.txt', 'utf8');
const $ = cheerio.load(html);

const allLabelsAndTables = $('label, table');
let currentPoint = {};
let dataCountPerPoint = [];

allLabelsAndTables.each((_, el) => {
    const $el = $(el);
    if ($el.is('label')) {
        const text = $el.text().trim();
        if (text.includes("Balneário:")) currentPoint.balneario = text.replace("Balneário:", "").trim();
        if (text.includes("Ponto de Coleta:")) currentPoint.point = text.replace("Ponto de Coleta:", "").trim();
    } else if ($el.is('table')) {
        const rows = $el.find('tbody tr');
        if (rows.length > 0 && currentPoint.point) {
            dataCountPerPoint.push({
                point: currentPoint.point,
                balneario: currentPoint.balneario,
                rowCount: rows.length,
                firstDate: rows.eq(0).find('td').eq(0).text().trim(),
                lastDate: rows.last().find('td').eq(0).text().trim()
            });
            currentPoint = {};
        }
    }
});

console.log(JSON.stringify(dataCountPerPoint.slice(0, 5), null, 2));
console.log('Total points with data:', dataCountPerPoint.length);
