const locationKeywordsMap: Record<string, number[]> = {
    "front": [1, 2, 3],
    "middle": [4, 5, 6],
    "back": [7, 8],
    "windows": [1, 6, 7],
    "door": [3, 4, 8],
    "corner": [1, 3, 7, 8],
    "not front": [4, 5, 6, 7, 8],
    "not middle": [1, 2, 3, 7, 8],
    "not windows": [2, 3, 4, 5, 8],
    "not door": [1, 2, 5, 6, 7],
    "not 1 or 2": [3, 4, 5, 6, 7, 8]
}

export function parseLocationPreferences(prefString: string, isIntersection: boolean = true): number[] {
    // split string by newlines, trim whitespace, and filter out empty lines
    const lines = prefString.split('\n').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);

    if (lines.length === 0) return [1, 2, 3, 4, 5, 6, 7, 8];

    const seatSet = new Set<number>();

    if (isIntersection) {
        // Initialize with all tables, then narrow down via intersection
        [1, 2, 3, 4, 5, 6, 7, 8].forEach(n => seatSet.add(n));
    }

    for (const line of lines) {
        const mapped = locationKeywordsMap[line.toLowerCase()];
        const candidates: number[] = mapped
            ? mapped
            : line.split(',').map(s => parseInt(s.trim(), 10)).filter(n => n >= 1 && n <= 8);

        if (isIntersection) {
            for (const n of seatSet) {
                if (!candidates.includes(n)) seatSet.delete(n);
            }
        } else {
            candidates.forEach(n => seatSet.add(n));
        }
    }

    return Array.from(seatSet).sort((a, b) => a - b);
}

export function parseNameList(namesString: string): string[] {
    // for each line, split by comma separated and trim, add each name to the result set
    // return the array form of the result set
    const nameSet = new Set<string>();
    for (const line of namesString.split('\n')) {
        for (const name of line.split(',')) {
            const trimmed = name.trim();
            if (trimmed) nameSet.add(trimmed);
        }
    }
    return Array.from(nameSet);
}