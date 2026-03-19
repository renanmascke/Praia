const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const keyMatch = env.match(/GOOGLE_WEATHER_API_KEY=(.*)/);
const GOOGLE_WEATHER_API_KEY = keyMatch ? keyMatch[1].trim().replace(/['"]/g, '') : null;

async function testGoogleHours() {
    const lat = -27.5969;
    const lng = -48.5495;
    
    if (!GOOGLE_WEATHER_API_KEY) {
        console.error('API Key not found');
        return;
    }

    const url1 = `https://weather.googleapis.com/v1/forecast/hours:lookup?location.latitude=${lat}&location.longitude=${lng}&key=${GOOGLE_WEATHER_API_KEY}&hours=240`;
    console.log('Fetching URL 1 (Current - hours=240):', url1);
    const res1 = await fetch(url1);
    const data1 = await res1.json();
    console.log('Hours returned:', data1.forecastHours?.length || 0);
    console.log('Next Page Token:', data1.nextPageToken || 'NONE');

    if (data1.nextPageToken) {
        const url2 = `${url1}&pageToken=${data1.nextPageToken}`;
        console.log('Fetching Page 2:', url2);
        const res2 = await fetch(url2);
        const data2 = await res2.json();
        console.log('Hours returned (Page 2):', data2.forecastHours?.length || 0);
        console.log('Next Page Token (Page 2):', data2.nextPageToken || 'NONE');
    }
}

testGoogleHours();
