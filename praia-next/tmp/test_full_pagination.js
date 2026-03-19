const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const keyMatch = env.match(/GOOGLE_WEATHER_API_KEY=(.*)/);
const key = keyMatch[1].trim().replace(/['"]/g, '');

async function testFullPagination() {
    const lat = -27.5969;
    const lng = -48.5495;
    
    let allHours = [];
    let nextToken = '';
    let pages = 0;

    console.log('Starting Paginated Fetch...');

    while (pages < 10) {
        const url = `https://weather.googleapis.com/v1/forecast/hours:lookup?location.latitude=${lat}&location.longitude=${lng}&key=${key}&hours=240${nextToken ? `&pageToken=${nextToken}` : ''}`;
        console.log(`Fetching Page ${pages + 1}...`);
        const res = await fetch(url);
        if (!res.ok) {
            console.error('Error:', res.status, await res.text());
            break;
        }
        const data = await res.json();
        const batch = data.forecastHours || [];
        allHours = allHours.concat(batch);
        console.log(`   Items in page: ${batch.length} | Total so far: ${allHours.length}`);
        
        if (!data.nextPageToken || allHours.length >= 240) break;
        nextToken = data.nextPageToken;
        pages++;
    }

    console.log('\nFinal Status:');
    console.log('Total Hours Collected:', allHours.length);
    if (allHours.length > 0) {
        console.log('Start:', allHours[0].interval.startTime);
        console.log('End:', allHours[allHours.length-1].interval.startTime);
    }
}

testFullPagination();
