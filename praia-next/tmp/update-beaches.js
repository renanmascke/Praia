const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateBeachAnchors() {
    console.log("🔄 Atualizando pontos de previsão das praias por região...");

    const mapping = {
        'North': '89d38d59-1046-4e6e-bc02-023aa24abea6',
        'North/Exposed': '89d38d59-1046-4e6e-bc02-023aa24abea6',
        'East': '9442ef5e-67e7-4ed8-907a-601f1d353af2',
        'East/Exposed': '9442ef5e-67e7-4ed8-907a-601f1d353af2',
        'South': 'a03b0dfb-e302-4054-87ab-766b8845dc63',
        'South/Exposed': 'a03b0dfb-e302-4054-87ab-766b8845dc63'
    };

    for (const [region, anchorId] of Object.entries(mapping)) {
        const result = await prisma.beach.updateMany({
            where: { region: region },
            data: { anchorId: anchorId }
        });
        console.log(`✅ Região ${region}: ${result.count} praias atualizadas.`);
    }

    console.log("🏁 Atualização concluída!");
    process.exit(0);
}

updateBeachAnchors().catch(e => {
    console.error(e);
    process.exit(1);
});
