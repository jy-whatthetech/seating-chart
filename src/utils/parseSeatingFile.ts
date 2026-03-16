import * as XLSX from 'xlsx';
import { parseLocationPreferences, parseNameList } from './parsingUtils';

export type SeatingRow = {
  id: number;
  requirements: { location: number[]; notPeople: string[] };
  preferences: { location: number[] };
} & Record<string, unknown>;

export async function parseSeatingFile(file: File): Promise<SeatingRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Get all rows as arrays (header: 1 means row indices start at 0)
  const rawRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });

  // Row 2 (index 1) contains the headers
  const headers = (rawRows[1] ?? []).map((h) => String(h));

  // Identify the matched column indices
  const nameIdx = headers.findIndex((h) => h.toLowerCase().includes('name'));
  const personPrefIdx = headers.findIndex((h) => h.toLowerCase().trim() === 'person preference');
  const cannotSitWithIdx = headers.findIndex((h) => h.toLowerCase().trim() === 'cannot sit with');
  const locationPrefIdx = headers.findIndex((h) => h.toLowerCase().trim() === 'location preference');
  const locationNeedsIdx = headers.findIndex((h) => h.toLowerCase().trim() === 'location needs');
  const socialIdx = headers.findIndex((h) => h.toLowerCase().includes('social'));

  const colMap: { key: string; idx: number }[] = [
    { key: nameIdx >= 0 ? headers[nameIdx] : 'name', idx: nameIdx },
    { key: personPrefIdx >= 0 ? headers[personPrefIdx] : 'person preference', idx: personPrefIdx },
    { key: cannotSitWithIdx >= 0 ? headers[cannotSitWithIdx] : 'cannot sit with', idx: cannotSitWithIdx },
    { key: locationPrefIdx >= 0 ? headers[locationPrefIdx] : 'location preference', idx: locationPrefIdx },
    { key: locationNeedsIdx >= 0 ? headers[locationNeedsIdx] : 'location needs', idx: locationNeedsIdx },
    { key: socialIdx >= 0 ? headers[socialIdx] : 'social', idx: socialIdx },
  ];

  const result: SeatingRow[] = [];

  // Rows 3–50 are at indices 2–49
  for (let i = 2; i <= 49; i++) {
    const row = rawRows[i];
    if (!row) continue;

    // Skip if name column is empty
    if (nameIdx < 0 || !String(row[nameIdx] ?? '').trim()) continue;

    const obj: SeatingRow = {
      id: i - 1,
      requirements: {
        location: parseLocationPreferences(
          locationNeedsIdx >= 0 ? String(row[locationNeedsIdx] ?? '') : ''
        ),
        notPeople: (() => {
          const val = cannotSitWithIdx >= 0 ? String(row[cannotSitWithIdx] ?? '').trim() : '';
          return val && val !== '0' ? parseNameList(val) : [];
        })(),
      },
      preferences: {
        location: parseLocationPreferences(
          locationPrefIdx >= 0 ? String(row[locationPrefIdx] ?? '') : '',
          false
        ),
      },
    };
    for (const { key, idx } of colMap) {
      if (idx >= 0) {
        let val = String(row[idx] ?? '');
        // "Last, First M." → "First M. Last"
        if (idx === nameIdx && val.includes(',')) {
          const [last, rest] = val.split(',', 2);
          val = `${rest.trim()} ${last.trim()}`;
        }
        obj[key] = val;
      }
    }
    result.push(obj);
  }

  return result;
}
