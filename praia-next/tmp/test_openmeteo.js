async function testOpenMeteo() {
    const lat = -27.5969;
    const lng = -48.5495;
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&hourly=wave_height,wave_direction,wave_period&timezone=America%2FSao_Paulo`;
    
    console.log('Fetching Open-Meteo Waves:', url);
    const res = await fetch(url);
    const data = await res.json();
    console.log('Open-Meteo Response (Sample 1h):', JSON.stringify({
        time: data.hourly?.time?.[0],
        waveHeight: data.hourly?.wave_height?.[0],
        waveDirection: data.hourly?.wave_direction?.[0],
        wavePeriod: data.hourly?.wave_period?.[0]
    }, null, 2));
}

testOpenMeteo();
