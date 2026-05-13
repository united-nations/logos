import fs from 'fs';
import path from 'path';

export interface UNEntity {
    entity: string;
    entity_long: string;
    entity_description?: string;
    un_principal_organ?: string;
    system_grouping?: string;
    category?: string;
}

export interface LogoEntry {
    format: string;
    url: string;
}

export interface EntityLogos {
    light: LogoEntry[];
    dark: LogoEntry[];
}

export interface EntityWithLogos extends UNEntity {
    logos: EntityLogos;
}

function parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === '"') {
            if (insideQuotes && text[i + 1] === '"') {
                cell += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            row.push(cell);
            cell = '';
        } else if (char === '\n' && !insideQuotes) {
            row.push(cell);
            if (row.some(c => c.trim())) rows.push(row);
            row = [];
            cell = '';
        } else if (char === '\r') {
            continue;
        } else {
            cell += char;
        }
    }

    if (cell || row.length > 0) {
        row.push(cell);
        if (row.some(c => c.trim())) rows.push(row);
    }

    return rows;
}

export function getEntities(): UNEntity[] {
    const csvPath = path.join(process.cwd(), 'public', 'data', 'un-entities.csv');
    const csvText = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvText);
    if (rows.length < 2) return [];

    const headers = rows[0];
    const idx = (col: string) => headers.indexOf(col);

    return rows.slice(1)
        .map(row => ({
            entity: row[idx('entity')]?.trim() || '',
            entity_long: row[idx('entity_long')]?.trim() || '',
            entity_description: row[idx('entity_description')]?.trim() || '',
            un_principal_organ: row[idx('un_principal_organ')]?.trim() || '',
            system_grouping: row[idx('system_grouping')]?.trim() || '',
            category: row[idx('category')]?.trim() || '',
        }))
        .filter(e => e.entity && e.entity_long);
}

export function getAvailableLogos(entity: string, basePath = ''): EntityLogos {
    const modes = ['light', 'dark'] as const;
    const formats = ['svg', 'png', 'jpg', 'pdf'];
    const result: EntityLogos = { light: [], dark: [] };

    for (const mode of modes) {
        const dir = path.join(process.cwd(), 'public', 'images', mode);
        for (const format of formats) {
            const file = `${entity.toLowerCase()}.${format}`;
            try {
                if (fs.existsSync(path.join(dir, file))) {
                    result[mode].push({
                        format,
                        url: `${basePath}/images/${mode}/${file}`,
                    });
                }
            } catch {
                // ignore missing directories
            }
        }
    }

    return result;
}
