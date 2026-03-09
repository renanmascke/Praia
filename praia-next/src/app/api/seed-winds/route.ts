import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const windDirections = [
    { code: 'N', name: 'Norte', icon: '⬇️' },
    { code: 'NNE', name: 'Nor-nordeste', icon: '↙️' },
    { code: 'NE', name: 'Nordeste', icon: '↙️' },
    { code: 'ENE', name: 'Lés-nordeste', icon: '↙️' },
    { code: 'E', name: 'Leste', icon: '⬅️' },
    { code: 'ESE', name: 'Lés-sudeste', icon: '↖️' },
    { code: 'SE', name: 'Sudeste', icon: '↖️' },
    { code: 'SSE', name: 'Su-sudeste', icon: '↖️' },
    { code: 'S', name: 'Sul', icon: '⬆️' },
    { code: 'SSW', name: 'Su-sudoeste', icon: '↗️' },
    { code: 'SW', name: 'Sudoeste', icon: '↗️' },
    { code: 'WSW', name: 'Oés-sudoeste', icon: '↗️' },
    { code: 'W', name: 'Oeste', icon: '➡️' },
    { code: 'WNW', name: 'Oés-noroeste', icon: '↘️' },
    { code: 'NW', name: 'Noroeste', icon: '↘️' },
    { code: 'NNW', name: 'Nor-noroeste', icon: '↘️' },

    // English codes from API
    { code: 'NORTH', name: 'Norte', icon: '⬇️' },
    { code: 'SOUTH', name: 'Sul', icon: '⬆️' },
    { code: 'EAST', name: 'Leste', icon: '⬅️' },
    { code: 'WEST', name: 'Oeste', icon: '➡️' },
    { code: 'NORTHEAST', name: 'Nordeste', icon: '↙️' },
    { code: 'NORTHWEST', name: 'Noroeste', icon: '↘️' },
    { code: 'SOUTHEAST', name: 'Sudeste', icon: '↖️' },
    { code: 'SOUTHWEST', name: 'Sudoeste', icon: '↗️' },
];

export async function GET() {
    try {
        console.log(`Buscando popular ${windDirections.length} direções de vento...`);
        let seeded = 0;

        for (const dir of windDirections) {
            await prisma.windDirection.upsert({
                where: { code: dir.code },
                update: { name: dir.name, icon: dir.icon },
                create: dir,
            });
            seeded++;
        }

        return NextResponse.json({ success: true, message: `Seeded ${seeded} wind directions successfully.` });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
