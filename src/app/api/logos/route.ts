import { NextRequest, NextResponse } from 'next/server';
import { getEntities, getAvailableLogos } from '@/lib/entities';

export const dynamic = 'force-dynamic';

/**
 * GET /api/logos
 *
 * Returns all UN entities that have at least one logo available.
 *
 * Query params:
 *   mode   – "light" | "dark" | "all"  (default: "all")
 *   format – "svg" | "png" | "jpg" | "pdf"  (optional filter)
 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const modeFilter = searchParams.get('mode') || 'all';
    const formatFilter = searchParams.get('format') || null;

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const entities = getEntities();

    const results = entities
        .map(entity => {
            const logos = getAvailableLogos(entity.entity, basePath);

            // Apply mode filter
            const filtered = {
                light: modeFilter === 'dark' ? [] : logos.light,
                dark: modeFilter === 'light' ? [] : logos.dark,
            };

            // Apply format filter
            if (formatFilter) {
                filtered.light = filtered.light.filter(l => l.format === formatFilter);
                filtered.dark = filtered.dark.filter(l => l.format === formatFilter);
            }

            if (filtered.light.length === 0 && filtered.dark.length === 0) return null;

            return {
                entity: entity.entity,
                entity_long: entity.entity_long,
                un_principal_organ: entity.un_principal_organ || null,
                system_grouping: entity.system_grouping || null,
                logos: filtered,
            };
        })
        .filter(Boolean);

    return NextResponse.json({ count: results.length, entities: results });
}
