import { NextRequest, NextResponse } from 'next/server';
import { getEntities, getAvailableLogos } from '@/lib/entities';

export const dynamic = 'force-dynamic';

/**
 * GET /api/logos/[entity]
 *
 * Returns logo URLs and metadata for a specific UN entity.
 * Entity codes are case-insensitive (e.g. "UN", "un", "UNICEF").
 *
 * Query params:
 *   mode   – "light" | "dark" | "all"  (default: "all")
 *   format – "svg" | "png" | "jpg" | "pdf"  (optional filter)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ entity: string }> }
) {
    const { entity: entityParam } = await params;
    const code = entityParam.toUpperCase();

    const { searchParams } = request.nextUrl;
    const modeFilter = searchParams.get('mode') || 'all';
    const formatFilter = searchParams.get('format') || null;

    const entities = getEntities();
    const entity = entities.find(e => e.entity.toUpperCase() === code);

    if (!entity) {
        return NextResponse.json({ error: `Entity "${code}" not found.` }, { status: 404 });
    }

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const logos = getAvailableLogos(entity.entity, basePath);

    const filtered = {
        light: modeFilter === 'dark' ? [] : logos.light,
        dark: modeFilter === 'light' ? [] : logos.dark,
    };

    if (formatFilter) {
        filtered.light = filtered.light.filter(l => l.format === formatFilter);
        filtered.dark = filtered.dark.filter(l => l.format === formatFilter);
    }

    if (filtered.light.length === 0 && filtered.dark.length === 0) {
        return NextResponse.json(
            { error: `No logos found for "${code}" with the specified filters.` },
            { status: 404 }
        );
    }

    return NextResponse.json({
        entity: entity.entity,
        entity_long: entity.entity_long,
        entity_description: entity.entity_description || null,
        un_principal_organ: entity.un_principal_organ || null,
        system_grouping: entity.system_grouping || null,
        category: entity.category || null,
        logos: filtered,
    });
}
