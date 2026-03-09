const cheerio = require('cheerio');
const fs = require('fs');

async function testAtualRota() {
    try {
        const html = fs.readFileSync('ima_current.html', 'utf8');
        const $ = cheerio.load(html);

        console.log("Colunas das primeiras duas linhas:");
        const rows = $('.table-print tbody tr').slice(0, 2);

        rows.each((rowIndex, tr) => {
            console.log(`\n--- LINHA ${rowIndex + 1} ---`);
            $(tr).find('td').each((i, el) => {
                const img = $(el).find('img').attr('src');
                const text = $(el).text().trim().replace(/\s+/g, ' ');
                console.log(`Col ${i}:`, img ? `[IMG: ${img}]` : text);
            });
        });

    } catch (e) {
        console.error(e);
    }
}

testAtualRota();
