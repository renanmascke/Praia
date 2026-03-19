const { PrismaClient } = require('@prisma/client');

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
    console.log("Criando tabela WindDirection...");
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`WindDirection\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`code\` VARCHAR(191) NOT NULL,
            \`name\` VARCHAR(191) NOT NULL,
            \`icon\` VARCHAR(191) NOT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            UNIQUE INDEX \`WindDirection_code_key\`(\`code\`),
            PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    console.log("Inserindo dados básicos de ventos...");
    for (const dir of windDirections) {
        await prisma.$executeRawUnsafe(`
            INSERT INTO \`WindDirection\` (\`id\`, \`code\`, \`name\`, \`icon\`, \`createdAt\`, \`updatedAt\`) 
            VALUES (UUID(), '${dir.code}', '${dir.name}', '${dir.icon}', NOW(), NOW())
            ON DUPLICATE KEY UPDATE \`name\` = '${dir.name}', \`icon\` = '${dir.icon}', \`updatedAt\` = NOW();
        `);
    }

    console.log("Concluído!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
