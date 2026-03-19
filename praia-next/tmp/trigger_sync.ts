import { runWeatherSync } from '../src/app/api/sync-weather/route';

async function main() {
    console.log('Starting Weather Sync (Direct Call)...');
    const result = await runWeatherSync(true);
    console.log('Result:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
