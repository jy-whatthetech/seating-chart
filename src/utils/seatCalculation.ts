import type { SeatingRow } from './parseSeatingFile';

const NUM_TABLES = 8;
const MAX_ITERATIONS = 500_000;
const MAX_RETRIES = 5;

export interface SeatCalculationResult {
  students: string[][];   // 8 tables × 5 seats
  unassigned: string[];
}

/** Fisher-Yates shuffle (in-place) */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function calculateSeating(
  names: string[],
  rowByName: Map<string, SeatingRow>,
  groupSizes: number[],
): SeatCalculationResult | null {
  const totalSeats = groupSizes.reduce((a, b) => a + b, 0);
  const overflowCount = Math.max(0, names.length - totalSeats);

  // Build a case-insensitive lookup from lowercase name → original name
  const lowerToName = new Map<string, string>();
  for (const name of names) {
    lowerToName.set(name.toLowerCase(), name);
  }

  // Build valid tables (0-based indices) for each person
  const validTables = new Map<string, number[]>();
  for (const name of names) {
    const row = rowByName.get(name);
    const locationNums = row?.requirements?.location;
    if (locationNums && locationNums.length < NUM_TABLES) {
      // Convert 1-based table numbers to 0-based indices
      validTables.set(name, locationNums.map(n => n - 1).filter(n => n >= 0 && n < NUM_TABLES));
    } else {
      // No location constraint — all tables valid
      validTables.set(name, Array.from({ length: NUM_TABLES }, (_, i) => i));
    }
  }

  // Build bilateral conflict graph (case-insensitive)
  const conflicts = new Map<string, Set<string>>();
  for (const name of names) {
    conflicts.set(name, new Set());
  }
  for (const name of names) {
    const row = rowByName.get(name);
    const notPeople = row?.requirements?.notPeople;
    if (!notPeople) continue;
    for (const blocked of notPeople) {
      const match = lowerToName.get(blocked.toLowerCase());
      if (match && match !== name) {
        conflicts.get(name)!.add(match);
        conflicts.get(match)!.add(name);
      }
    }
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Sort by most-constrained-first (fewest valid tables), shuffle within ties
    const candidates = shuffle([...names]);
    candidates.sort((a, b) => {
      return (validTables.get(a)?.length ?? NUM_TABLES) - (validTables.get(b)?.length ?? NUM_TABLES);
    });

    // Backtracking state
    const tableAssignments: string[][] = Array.from({ length: NUM_TABLES }, () => []);
    const unassignedResult: string[] = [];
    let remainingOverflow = overflowCount;
    let iterations = 0;

    function assign(idx: number): boolean {
      if (++iterations > MAX_ITERATIONS) return false;
      if (idx === candidates.length) return true;

      const name = candidates[idx];
      const nameConflicts = conflicts.get(name) ?? new Set<string>();
      const tables = validTables.get(name) ?? [];

      // Collect valid tables: has capacity + no conflicts with current occupants
      const options = tables.filter(t => {
        if (tableAssignments[t].length >= groupSizes[t]) return false;
        for (const occupant of tableAssignments[t]) {
          if (nameConflicts.has(occupant)) return false;
        }
        return true;
      });

      shuffle(options);

      // Try each valid table
      for (const t of options) {
        tableAssignments[t].push(name);
        if (assign(idx + 1)) return true;
        tableAssignments[t].pop();
      }

      // If no table works and overflow budget remains, try unassigned
      if (remainingOverflow > 0) {
        remainingOverflow--;
        unassignedResult.push(name);
        if (assign(idx + 1)) return true;
        unassignedResult.pop();
        remainingOverflow++;
      }

      return false;
    }

    if (assign(0)) {
      // Convert to output format: 8 tables × 5 seats
      const students: string[][] = Array.from({ length: NUM_TABLES }, (_, t) => {
        const assigned = shuffle([...tableAssignments[t]]);
        const seats = Array(5).fill('');
        for (let s = 0; s < assigned.length && s < groupSizes[t]; s++) {
          seats[s] = assigned[s];
        }
        return seats;
      });

      return { students, unassigned: unassignedResult };
    }
  }

  return null;
}
