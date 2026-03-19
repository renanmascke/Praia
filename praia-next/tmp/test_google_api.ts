import fetch from 'node-fetch';
import * as fs from 'fs';

const GOOGLE_WEATHER_API_KEY = process.env.GOOGLE_WEATHER_API_KEY;
const lat = -27.5969;
const lng = -48.5495;

async function test() {
    if (!GOOGLE_WEATHER_API_KEY) {
        console.error('GOOGLE_WEATHER_API_KEY not found');
        return;
    }

    const dailyUrl = `https://weather.googleapis.com/v1/forecast/days:lookup?location.latitude=${lat}&location.longitude=${lng}&key=${GOOGLE_WEATHER_API_KEY}&days=10`;
    console.log('Fetching:', dailyUrl);

    try {
        const res = await fetch(dailyUrl);
        const data = await res.json();
        
        const report = {
            status: res.status,
            forecastDaysCount: data.forecastDays?.length || 0,
            firstDay: data.forecastDays?.[0]?.interval?.startTime,
            lastDay: data.forecastDays?.[data.forecastDays?.length - 1]?.interval?.startTime,
            fullResponse: data
        };

        fs.writeFileSync('tmp/google_raw_response.json', JSON.stringify(report, null, 2));
        console.log('Raw response saved to tmp/google_raw_response.json');
        console.log('Days returned:', report.forecastDaysCount);
    } catch (e) {
        console.error(e);
    }
}

test();
