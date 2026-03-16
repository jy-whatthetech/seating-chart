import { useState, useRef, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
// import MenuItem from '@mui/material/MenuItem';
// import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import UploadFile from '@mui/icons-material/UploadFile';
import SaveOutlined from '@mui/icons-material/SaveOutlined';
import AutorenewOutlined from '@mui/icons-material/AutorenewOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import Tooltip from '@mui/material/Tooltip';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import TableCard from './TableCard';
import UnassignedPanel from './UnassignedPanel';
import { parseSeatingFile, type SeatingRow } from '../utils/parseSeatingFile';
import { calculateSeating } from '../utils/seatCalculation';
import { glassPanel } from '../theme/glassStyles';

export type SeatAddress =
  | { type: 'table'; tableIndex: number; seatIndex: number }
  | { type: 'unassigned'; index: number };

const NUM_TABLES = 8;

const glassButtonSx = {
  textTransform: 'none',
  background: 'rgba(60, 130, 246, 1.0)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  borderRadius: '12px',
  boxShadow: '0 4px 12px rgba(60, 130, 246, 0.2)',
  fontWeight: 600,
  '&:hover': {
    background: 'rgba(60, 130, 246, 0.8)',
    boxShadow: '0 6px 20px rgba(60, 130, 246, 0.3)',
  },
  '&.Mui-disabled': {
    background: 'rgba(0, 0, 0, 0.08)',
    backdropFilter: 'blur(8px)',
    color: 'rgba(0, 0, 0, 0.3)',
  },
} as const;

export default function SeatingChart() {
  const [students, setStudents] = useState<string[][]>(
    () => Array.from({ length: NUM_TABLES }, () => Array(5).fill(''))
  );
  const [groupSizes, setGroupSizes] = useState<number[]>(
    () => Array(NUM_TABLES).fill(4)
  );
  const [unassigned, setUnassigned] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [seatingRows, setSeatingRows] = useState<SeatingRow[]>([]);
  // const [priority, setPriority] = useState<string>('location');
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [draggedValidTables, setDraggedValidTables] = useState<number[] | null>(null);

  const roomGridRef = useRef<HTMLDivElement>(null);
  const loadInputRef = useRef<HTMLInputElement>(null);
  const [roomGridHeight, setRoomGridHeight] = useState<number | undefined>();

  // Build name→SeatingRow lookup for violation checking
  const rowByName = useMemo(() => {
    const map = new Map<string, SeatingRow>();
    if (seatingRows.length === 0) return map;
    const nk = Object.keys(seatingRows[0]).find(k => k.toLowerCase().includes('name'));
    if (!nk) return map;
    for (const row of seatingRows) {
      const n = String(row[nk] ?? '');
      if (n) map.set(n, row);
    }
    return map;
  }, [seatingRows]);

  // Aggregate all constraint violations for the validation panel
  const validationErrors = useMemo(() => {
    const errors: { name: string; tableNumber: number; validTables?: number[]; conflictNames: string[] }[] = [];
    for (let t = 0; t < NUM_TABLES; t++) {
      const tblNum = t + 1;
      for (const name of students[t]) {
        if (!name) continue;
        const sr = rowByName.get(name);
        if (!sr) continue;

        const loc = sr.requirements?.location;
        const hasLocationViolation = loc && loc.length > 0 && loc.length < NUM_TABLES && !loc.includes(tblNum);

        const notPeople = sr.requirements?.notPeople;
        const conflictNames: string[] = [];
        if (notPeople && notPeople.length > 0) {
          const notLower = notPeople.map(p => p.toLowerCase());
          for (const other of students[t]) {
            if (other && other !== name && notLower.includes(other.toLowerCase())) {
              conflictNames.push(other);
            }
          }
        }

        if (hasLocationViolation || conflictNames.length > 0) {
          errors.push({
            name,
            tableNumber: tblNum,
            validTables: hasLocationViolation ? loc : undefined,
            conflictNames,
          });
        }
      }
    }
    return errors;
  }, [students, rowByName]);

  useEffect(() => {
    const el = roomGridRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setRoomGridHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const getName = (addr: SeatAddress): string => {
    if (addr.type === 'table') return students[addr.tableIndex][addr.seatIndex] ?? '';
    return unassigned[addr.index] ?? '';
  };

  const handleSeatDragStart = (source: SeatAddress) => {
    let name = '';
    if (source.type === 'table') {
      name = students[source.tableIndex][source.seatIndex];
    } else {
      name = unassigned[source.index] ?? '';
    }
    if (!name) return;
    const sr = rowByName.get(name);
    const loc = sr?.requirements?.location;
    if (loc && loc.length > 0 && loc.length < NUM_TABLES) {
      setDraggedValidTables(loc);
    } else {
      setDraggedValidTables(null);
    }
  };

  const handleSeatDragEnd = () => {
    setDraggedValidTables(null);
  };

  const handleDrop = (source: SeatAddress, target: SeatAddress) => {
    // Same address — no-op
    if (source.type === target.type) {
      if (source.type === 'table' && target.type === 'table' &&
          source.tableIndex === target.tableIndex && source.seatIndex === target.seatIndex) return;
      if (source.type === 'unassigned' && target.type === 'unassigned' &&
          source.index === target.index) return;
    }

    const srcName = getName(source);
    const tgtName = getName(target);

    // Table → Table
    if (source.type === 'table' && target.type === 'table') {
      setStudents((prev) => {
        const next = prev.map((arr) => [...arr]);
        next[target.tableIndex][target.seatIndex] = srcName;
        next[source.tableIndex][source.seatIndex] = tgtName;
        return next;
      });
    }
    // Table → Unassigned
    else if (source.type === 'table' && target.type === 'unassigned') {
      setStudents((prev) => {
        const next = prev.map((arr) => [...arr]);
        next[source.tableIndex][source.seatIndex] = tgtName; // '' if appending to empty slot
        return next;
      });
      setUnassigned((prev) => {
        const next = [...prev];
        if (target.index < next.length) {
          next[target.index] = srcName; // swap into existing slot
        } else {
          next.push(srcName); // append
        }
        return next;
      });
    }
    // Unassigned → Table
    else if (source.type === 'unassigned' && target.type === 'table') {
      setStudents((prev) => {
        const next = prev.map((arr) => [...arr]);
        next[target.tableIndex][target.seatIndex] = srcName;
        return next;
      });
      setUnassigned((prev) => {
        const next = [...prev];
        if (tgtName) {
          next[source.index] = tgtName; // swap
        } else {
          next.splice(source.index, 1); // remove from list
        }
        return next;
      });
    }
    // Unassigned → Unassigned
    else if (source.type === 'unassigned' && target.type === 'unassigned') {
      setUnassigned((prev) => {
        const next = [...prev];
        if (target.index < next.length) {
          // Swap
          next[source.index] = tgtName;
          next[target.index] = srcName;
        } else {
          // Move to end
          next.splice(source.index, 1);
          next.push(srcName);
        }
        return next;
      });
    }
  };

  const handleGroupSizeChange = (tableIndex: number, size: number) => {
    const prevSize = groupSizes[tableIndex];

    // 4→5: shift grid names into slots 1-4, leave slot 0 (top seat) empty
    if (prevSize === 4 && size === 5) {
      setStudents((prev) => {
        const next = prev.map((arr) => [...arr]);
        const old = prev[tableIndex];
        next[tableIndex] = ['', old[0], old[1], old[2], old[3]];
        return next;
      });
    }

    // 5→4: move top seat (slot 0) to unassigned if non-empty, shift grid into slots 0-3
    if (prevSize === 5 && size === 4) {
      const topName = students[tableIndex][0];
      setStudents((prev) => {
        const next = prev.map((arr) => [...arr]);
        const old = prev[tableIndex];
        next[tableIndex] = [old[1], old[2], old[3], old[4], ''];
        return next;
      });
      if (topName) {
        setUnassigned((prev) => [...prev, topName]);
      }
    }

    setGroupSizes((prev) => {
      const next = [...prev];
      next[tableIndex] = size;
      return next;
    });
  };

  const handleSave = async () => {
    // Build name → SeatingRow lookup
    const nameKey = seatingRows.length > 0
      ? Object.keys(seatingRows[0]).find((k) => k.toLowerCase().includes('name'))
      : undefined;
    const rowByName = new Map<string, SeatingRow>();
    if (nameKey) {
      for (const row of seatingRows) {
        const n = row[nameKey];
        if (n) rowByName.set(String(n), row);
      }
    }

    const saveData = {
      excelFileName: fileName,
      groupSizes,
      tables: students.map((seats, tableIndex) => ({
        tableIndex,
        seats: seats.map((name, seatIndex) => ({
          seatIndex,
          name,
          data: name ? (rowByName.get(name) ?? null) : null,
        })),
      })),
      unassigned: unassigned.map((name, index) => ({
        index,
        name,
        data: name ? (rowByName.get(name) ?? null) : null,
      })),
    };

    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });

    // Try native file picker (Chrome/Edge), fallback to download
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
          suggestedName: 'seating-chart.json',
          types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return; // user cancelled
      }
    }
    // Fallback: trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seating-chart.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = (file: File) => {
    file.text().then((text) => {
      const data = JSON.parse(text);
      setFileName(data.excelFileName ?? '');
      setGroupSizes(data.groupSizes);
      setStudents(
        data.tables.map((t: { seats: { name: string }[] }) =>
          t.seats.map((s) => s.name)
        )
      );
      setUnassigned(
        data.unassigned.map((u: { name: string }) => u.name)
      );
      // Rebuild seatingRows from all non-null data entries
      const rows: SeatingRow[] = [];
      for (const t of data.tables) {
        for (const s of t.seats) {
          if (s.data) rows.push(s.data);
        }
      }
      for (const u of data.unassigned) {
        if (u.data) rows.push(u.data);
      }
      setSeatingRows(rows);
    });
  };

  const handleRandomize = () => {
    if (seatingRows.length === 0) return;

    setIsRandomizing(true);
    const startTime = Date.now();

    const nameKey = Object.keys(seatingRows[0]).find(
      (k) => k.toLowerCase().includes('name')
    );
    if (!nameKey) { setIsRandomizing(false); return; }

    const names = seatingRows
      .map((r) => String(r[nameKey] ?? ''))
      .filter(Boolean);

    const rowByName = new Map<string, SeatingRow>();
    for (const row of seatingRows) {
      const n = String(row[nameKey] ?? '');
      if (n) rowByName.set(n, row);
    }

    // Yield to browser so spinner renders before computation
    setTimeout(() => {
      const result = calculateSeating(names, rowByName, groupSizes);

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 1000 - elapsed);

      setTimeout(() => {
        setIsRandomizing(false);
        if (result === null) {
          setErrorDialogOpen(true);
        } else {
          setStudents(result.students);
          setUnassigned(result.unassigned);
        }
      }, remaining);
    }, 0);
  };

  // Build rows using the original data indices
  const tableIndices = Array.from({ length: NUM_TABLES }, (_, i) => i);
  const frontIndices = tableIndices.slice(0, 3);
  const middleIndices = tableIndices.slice(3, 6);
  const backIndices = tableIndices.slice(6);

  const rows = [
    { label: 'back', indices: backIndices, startIndex: 6, reversed: false },
    { label: 'middle', indices: [...middleIndices].reverse(), startIndex: 3, reversed: true },
    { label: 'front', indices: frontIndices, startIndex: 0, reversed: false },
  ];

  const sharedLabelSx = {
    fontWeight: 600,
    color: 'rgba(0, 0, 0, 0.45)',
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
    writingMode: 'vertical-rl' as const,
  };

  return (
    <Box sx={{ minHeight: '100vh', py: 4, px: 2 }}>
      <Typography
        variant="h4"
        sx={{
          textAlign: 'center',
          fontWeight: 700,
          mb: 3,
          color: 'rgba(0, 0, 0, 0.75)',
        }}
      >
        Classroom Seating Chart
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 1374 }}>
        {/* Top Bar: User inputs for file upload, randomize seating button, randomizer algorithm priority selection, and save/load buttons */}
        <Box sx={{
          ...glassPanel,
          mb: 3,
          ml: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 3,
          py: 1.5,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.8)', whiteSpace: 'nowrap', fontSize: '14px', letterSpacing: 0.5 }}
            >
              Excel File (Seating Requirements)
            </Typography>
            <Tooltip
              title={
                <Box sx={{ fontSize: '13px', lineHeight: 1.6 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: 'rgba(0,0,0,0.8)' }}>Required Columns:</Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2, color: 'rgba(0,0,0,0.75)' }}>
                    <li><strong>Name</strong></li>
                    <li><strong>Cannot Sit With</strong> — comma-separated list of names matching the Name column</li>
                    <li>
                      <strong>Location Needs</strong> — one keyword per line:
                      <Box component="ul" sx={{ mt: 0.5, pl: 2 }}>
                        <li>Front, Middle, Back, Windows, Door</li>
                        <li>Not 1 or 2, Not middle, etc.</li>
                      </Box>
                    </li>
                  </Box>
                </Box>
              }
              arrow
              placement="bottom-start"
              slotProps={{
                tooltip: {
                  sx: {
                    background: 'rgba(255, 255, 255, 0.55)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    borderRadius: '14px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
                    color: 'rgba(0, 0, 0, 0.8)',
                    maxWidth: 300,
                    p: 1.5,
                  },
                },
                arrow: {
                  sx: { color: 'rgba(255, 255, 255, 0.55)' },
                },
              }}
            >
              <InfoOutlined sx={{ fontSize: 16, color: 'rgba(0,0,0,0.4)', cursor: 'default', '&:hover': { color: 'rgba(0,0,0,0.7)' } }} />
            </Tooltip>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.8)', fontSize: '14px', letterSpacing: 0.5 }}>:</Typography>
          </Box>
          <Button
            component="label"
            variant="outlined"
            startIcon={<UploadFile />}
            sx={{
              textTransform: 'none',
              background: 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              borderRadius: '12px',
              color: 'rgba(0, 0, 0, 0.6)',
              fontWeight: 500,
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              },
            }}
          >
            {fileName ? (fileName.length > 40 ? fileName.slice(0, 40) + '...' : fileName) : 'Choose File'}
            <input
              type="file"
              hidden
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setFileName(file.name);
                parseSeatingFile(file).then((rows) => {
                    setSeatingRows(rows);
                    if (rows.length === 0) return;

                    // Find the name key from the parsed columns
                    const nameKey = Object.keys(rows[0]).find(
                      (k) => k.toLowerCase().includes('name')
                    );
                    if (!nameKey) return;

                    const names = rows.map((r) => String(r[nameKey] ?? '')).filter(Boolean);

                    // Populate tables sequentially, respecting group sizes
                    let nameIdx = 0;
                    const newStudents = Array.from({ length: NUM_TABLES }, (_, tableIndex) => {
                      const seats = Array(5).fill('');
                      for (let s = 0; s < groupSizes[tableIndex] && nameIdx < names.length; s++) {
                        seats[s] = names[nameIdx++];
                      }
                      return seats;
                    });

                    setStudents(newStudents);
                    setUnassigned(names.slice(nameIdx));
                  });
              }}
            />
          </Button>

          {/* Comment this out for now - feature not implemented yet */}
          {/* <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.8)', whiteSpace: 'nowrap', fontSize: '14px', letterSpacing: 0.5, ml: 2 }}
          >
            Priority:
          </Typography>
          <Select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            size="small"
            MenuProps={{
              PaperProps: {
                sx: {
                  background: 'rgba(255, 255, 255, 0.45)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                  mt: 0.5,
                  '& .MuiMenuItem-root': {
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'rgba(0, 0, 0, 0.6)',
                    letterSpacing: 0.5,
                    borderRadius: '8px',
                    mx: 0.5,
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-selected': {
                      background: 'rgba(60, 130, 246, 0.15)',
                      fontWeight: 600,
                      '&:hover': {
                        background: 'rgba(60, 130, 246, 0.22)',
                      },
                    },
                  },
                },
              },
            }}
            sx={{
              minWidth: 140,
              background: 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              borderRadius: '12px',
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '& .MuiSelect-select': {
                fontSize: '14px',
                fontWeight: 600,
                color: 'rgba(0, 0, 0, 0.6)',
                letterSpacing: 0.5,
              },
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.6)',
              },
            }}
          >
            <MenuItem value="location">Location</MenuItem>
            <MenuItem value="groupmates">Groupmates</MenuItem>
            <MenuItem value="random">Random</MenuItem>
          </Select> */}

          <Button
            variant="contained"
            disabled={!fileName || isRandomizing}
            onClick={handleRandomize}
            startIcon={isRandomizing ? <CircularProgress size={20} color="inherit" /> : <AutorenewOutlined />}
            sx={{
                ...glassButtonSx,
                ml: 1,
                background: 'rgba(34, 197, 94, 1.0)',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                '&:hover': {
                  background: 'rgba(22, 163, 74, 0.9)',
                  boxShadow: '0 6px 20px rgba(34, 197, 94, 0.4)',
                },
              }}
          >
            Randomize
          </Button>

          <Button
            variant="contained"
            disabled={!fileName}
            onClick={handleSave}
            startIcon={<SaveOutlined />}
            sx={{ ...glassButtonSx, ml: 'auto' }}
          >
            Save
          </Button>
          <Button
            variant="contained"
            onClick={() => loadInputRef.current?.click()}
            sx={glassButtonSx}
          >
            Load
          </Button>
          <input
            ref={loadInputRef}
            type="file"
            hidden
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              handleLoad(file);
              e.target.value = '';
            }}
          />
        </Box>

        {/* Content row: room layout + unassigned panel */}
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* Room layout */}
        <Box sx={{ maxWidth: 1150, flex: 1 }}>
          <Box ref={roomGridRef} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Back of Room label */}
            <Typography
              variant="body2"
              sx={{
                textAlign: 'center',
                fontWeight: 600,
                color: 'rgba(0, 0, 0, 0.45)',
                textTransform: 'uppercase',
                letterSpacing: 2,
                py: 1,
              }}
            >
              Back of Room
            </Typography>

            {/* Middle section: side labels + grid */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Left: Windows label */}
              <Box sx={{ width: 40, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                <Typography variant="caption" sx={{ ...sharedLabelSx, transform: 'rotate(180deg)' }}>
                  Windows
                </Typography>
              </Box>

              {/* Table grid */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {rows.map((row) => (
                  <Box
                    key={row.label}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(6, 1fr)',
                      gap: 1.5,
                    }}
                  >
                    {row.indices.map((tableIdx, i) => (
                      <Box
                        key={tableIdx}
                        sx={{
                          gridColumn: row.indices.length === 2
                            ? i === 0 ? '2 / 4' : '4 / 6'
                            : `${i * 2 + 1} / ${i * 2 + 3}`,
                        }}
                      >
                        {(() => {
                          const tblNum = row.reversed
                            ? row.startIndex + row.indices.length - i
                            : row.startIndex + i + 1;
                          const tblStudents = students[tableIdx];
                          const violations = tblStudents.map(n => {
                            if (!n) return false;
                            const sr = rowByName.get(n);
                            const loc = sr?.requirements?.location;
                            if (!loc || loc.length === 0 || loc.length >= NUM_TABLES) return false;
                            return !loc.includes(tblNum);
                          });
                          const conflicts = tblStudents.map((n, si) => {
                            if (!n) return false;
                            const sr = rowByName.get(n);
                            const notPeople = sr?.requirements?.notPeople;
                            if (!notPeople || notPeople.length === 0) return false;
                            const notLower = notPeople.map(p => p.toLowerCase());
                            return tblStudents.some((other, oi) =>
                              oi !== si && other && notLower.includes(other.toLowerCase())
                            );
                          });
                          const prefMatches = tblStudents.map(n => {
                            if (!n) return false;
                            const sr = rowByName.get(n);
                            const pref = sr?.preferences?.location;
                            if (!pref || pref.length === 0) return false;
                            return pref.includes(tblNum);
                          });
                          return (
                            <TableCard
                              tableNumber={tblNum}
                              tableIndex={tableIdx}
                              students={tblStudents}
                              groupSize={groupSizes[tableIdx]}
                              onGroupSizeChange={(size) => handleGroupSizeChange(tableIdx, size)}
                              onSeatDrop={handleDrop}
                              onSeatDragStart={handleSeatDragStart}
                              onSeatDragEnd={handleSeatDragEnd}
                              dragInvalidTable={draggedValidTables != null && !draggedValidTables.includes(tblNum)}
                              seatViolations={violations}
                              seatConflicts={conflicts}
                              seatPreferenceMatch={prefMatches}
                            />
                          );
                        })()}
                      </Box>
                    ))}
                  </Box>
                ))}
              </Box>

              {/* Right: Door label */}
              <Box sx={{ width: 40, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                <Typography variant="caption" sx={sharedLabelSx}>
                  Door (Entrance)
                </Typography>
              </Box>
            </Box>

            {/* Front label */}
            <Typography
              variant="body2"
              sx={{
                textAlign: 'center',
                fontWeight: 600,
                color: 'rgba(0, 0, 0, 0.45)',
                textTransform: 'uppercase',
                letterSpacing: 2,
                py: 1,
              }}
            >
              Front / Whiteboard
            </Typography>
          </Box>
        </Box>

        {/* Unassigned panel */}
        <UnassignedPanel names={unassigned} onSeatDrop={handleDrop} onSeatDragStart={handleSeatDragStart} onSeatDragEnd={handleSeatDragEnd} maxHeight={roomGridHeight} />
        </Box>{/* end content row */}

      {validationErrors.length > 0 && (
        <Box sx={{
          mt: 2,
          mx: 'auto',
          maxWidth: 900,
          width: '100%',
          background: 'rgba(20, 20, 30, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          p: 2,
        }}>
          <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 1, fontWeight: 700 }}>
            Validation Issues
          </Typography>
          {validationErrors.map((err, i) => (
            <Typography key={i} variant="body2" sx={{ color: 'rgba(240, 80, 80, 0.95)', fontSize: '13px', lineHeight: 1.8 }}>
              {err.name} (Table {err.tableNumber}):
              {err.validTables && ` must sit at table${err.validTables.length > 1 ? 's' : ''} ${err.validTables.join(', ')}.`}
              {err.validTables && err.conflictNames.length > 0 && ' '}
              {err.conflictNames.length > 0 && ` cannot sit with ${err.conflictNames.join(', ')}.`}
            </Typography>
          ))}
        </Box>
      )}

      </Box>{/* end column */}
      </Box>{/* end centering wrapper */}

      <Dialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            },
          },
          paper: {
            sx: {
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.45)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <ErrorOutline color="error" />
          No Valid Configuration
        </DialogTitle>
        <DialogContent>
          <Typography>
            No valid seat configuration found 😭
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setErrorDialogOpen(false)}
            variant="contained"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '12px',
              background: 'rgba(60, 130, 246, 1.0)',
              boxShadow: '0 4px 12px rgba(60, 130, 246, 0.2)',
              '&:hover': {
                background: 'rgba(60, 130, 246, 0.8)',
                boxShadow: '0 6px 20px rgba(60, 130, 246, 0.3)',
              },
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
