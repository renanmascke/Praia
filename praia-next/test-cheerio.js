const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('ima-html2.txt', 'utf8');
const $ = cheerio.load(html);

const points = [];
$('label:contains("Ponto de Coleta:")').each((i, el) => {
    const $label = $(el);
    const $table = $label.closest('div').nextAll('div').find('table').first();
    const $table2 = $label.closest('.row').nextAll('.row').first().find('table');
    const $table3 = $label.parents().nextAll().find('table').first();

    // Actually, looking at the previous output, the labels were NOT inside `.row`!
    // They were inside a `<td style="border: 0px;">`.
    // Let's find the nearest table that comes AFTER the label.
    // However, find() is for descendants, nextAll() is for siblings.

    // So let's trace from the label up to the highest element that is repeated for each point.
    // If we look at `ima-html2.txt`, the structure is something like:
    // <div>
    //    <table>
    //        <tr>
    //            <td><label>Ponto de Coleta: Ponto 37...</label></td>
    //            ...
    //        </tr>
    //    </table>
    // </div>
    // <div>
    //    <table class="table table-striped table-bordered table-hover">
    //       ... (the data) ...
    //    </table>
    // </div>
    // Or similar. Let's just grab the label's balneario, point, location.
    // And then find the *next* table with class `table-striped` or `table-hover` in the DOctree!
});

// Since $() returns elements in document order...
const allLabelsAndTables = $('label, table');
let currentPoint = {};
let extracted = [];
allLabelsAndTables.each((i, el) => {
    const $el = $(el);
    if ($el.is('label')) {
        const text = $el.text().trim();
        if (text.includes('Balneário:')) currentPoint.balneario = text.replace('Balneário:', '').trim();
        if (text.includes('Ponto de Coleta:')) currentPoint.point = text.replace('Ponto de Coleta:', '').trim();
        if (text.includes('Localização:')) currentPoint.location = text.replace('Localização:', '').trim();
    } else if ($el.is('table')) {
        // Only grab tables that actually have the 'Data', 'Hora', etc headers
        const headers = $el.find('th').text() || $el.find('td').first().text();
        if (headers.includes('E. coli') || headers.includes('escherichia') || currentPoint.point) {

            const firstDataRow = $el.find('tbody tr').eq(0);
            if (firstDataRow.length && firstDataRow.find('td').length > 5) {
                const tds = firstDataRow.find('td');
                const ecoli = tds.eq(7).text().trim();
                const vDate = tds.eq(0).text().trim();

                if (ecoli) {
                    extracted.push({
                        balneario: currentPoint.balneario,
                        point: currentPoint.point,
                        location: currentPoint.location,
                        ecoli: ecoli,
                        date: vDate
                    });
                    // Reset currentPoint after pairing with a table
                    currentPoint = {};
                }
            }
        }
    }
});
console.log('Extracted Data:', extracted.slice(0, 5));
console.log('Total extracted:', extracted.length);

