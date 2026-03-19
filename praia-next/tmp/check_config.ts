import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const report: any = {};

    report.systemConfigs = await (prisma as any).systemConfig.findMany();
    
    report.latestLogs = await (prisma as any).syncLog.findMany({
        orderBy: { startTime: 'desc' },
        take: 5
    });

    const anchors = await prisma.forecastAnchor.findMany();
    report.anchorsForecasts = [];
    for (const anchor of anchors) {
        const count = await prisma.weatherForecast.count({
            where: { anchorId: anchor.id }
        });
        const lastDate = await prisma.weatherForecast.findFirst({
            where: { anchorId: anchor.id },
            orderBy: { date: 'desc' }
        });
        report.anchorsForecasts.push({
            name: anchor.name,
            count,
            lastDate: lastDate?.date
        });
    }

    fs.writeFileSync('tmp/debug_report.json', JSON.stringify(report, null, 2));
    console.log('Report saved to tmp/debug_report.json');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
