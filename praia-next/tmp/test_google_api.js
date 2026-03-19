const fs = require('fs');
const https = require('https');

// Tentar ler do .env se possível, ou passar o valor no script
const env = fs.readFileSync('.env', 'utf8');
const keyMatch = env.match(/GOOGLE_WEATHER_API_KEY=(.*)/);
const GOOGLE_WEATHER_API_KEY = keyMatch ? keyMatch[1].trim().replace(/['"]/g, '') : null;

const lat = -27.5969;
const lng = -48.5495;

async function test() {
    if (!GOOGLE_WEATHER_API_KEY) {
        console.error('GOOGLE_WEATHER_API_KEY not found in .env');
        return;
    }

    const dailyUrl = `https://weather.googleapis.com/v1/forecast/days:lookup?location.latitude=${lat}&location.longitude=${lng}&key=${GOOGLE_WEATHER_API_KEY}&pageSize=10`;
    console.log('Fetching:', dailyUrl);

    try {
        const response = await fetch(dailyUrl);
        const data = await response.json();
        
        const report = {
            status: response.status,
            forecastDaysCount: data.forecastDays?.length || 0,
            firstDay: data.forecastDays?.[0]?.interval?.startTime,
            lastDay: data.forecastDays?.[data.forecastDays?.length - 1]?.interval?.startTime,
            fullResponse: data
        };

        fs.writeFileSync('tmp/google_raw_response.json', JSON.stringify(report, null, 2));
        console.log('Raw response saved to tmp/google_raw_response.json');
        console.log('Days returned:', report.forecastDaysCount);
        
        if (data.forecastDays) {
            data.forecastDays.forEach((d, i) => {
                console.log(`Day ${i}: ${d.interval.startTime}`);
            });
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

test();
