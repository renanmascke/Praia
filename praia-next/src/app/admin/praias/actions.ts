'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function saveBeach(data: any) {
    const { id, name, cityId, region, idealWind, offlineDesc, anchorId, newAnchor } = data;

    let finalAnchorId = anchorId;

    // Se houver um novo anchor para criar dentro do formulário da praia
    if (newAnchor && newAnchor.name && newAnchor.latitude && newAnchor.longitude) {
        const anchor = await prisma.forecastAnchor.create({
            data: {
                name: newAnchor.name,
                latitude: parseFloat(newAnchor.latitude),
                longitude: parseFloat(newAnchor.longitude),
                cityId: newAnchor.cityId || cityId,
            }
        });
        finalAnchorId = anchor.id;
    }

    const beachData: any = {
        name,
        cityId: cityId || null,
        region,
        idealWind,
        offlineDesc,
        anchorId: finalAnchorId || null,
    };

    if (id) {
        // Update
        await prisma.beach.update({
            where: { id },
            data: beachData
        });
    } else {
        // Create
        await prisma.beach.create({
            data: beachData
        });
    }

    revalidatePath('/admin/praias');
    revalidatePath('/admin'); // Revalidar dashboard
    return { success: true };
}

export async function deleteBeach(id: string) {
    await prisma.beach.delete({ where: { id } });
    revalidatePath('/admin/praias');
    revalidatePath('/admin');
    return { success: true };
}

export async function getAnchors() {
    return prisma.forecastAnchor.findMany({
        orderBy: { name: 'asc' },
        include: { city: true }
    });
}

export async function getCities() {
    return prisma.city.findMany({
        orderBy: { name: 'asc' }
    });
}
