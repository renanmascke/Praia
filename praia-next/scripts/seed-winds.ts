import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

async function main() {
    console.log(`Buscando popular ${windDirections.length} direções de vento...`);

    for (const dir of windDirections) {
        await prisma.windDirection.upsert({
            where: { code: dir.code },
            update: { name: dir.name, icon: dir.icon },
            create: dir,
        });
        console.log(`[OK] ${dir.code} - ${dir.name} ${dir.icon}`);
    }

    console.log("Seeding concluído com sucesso!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
