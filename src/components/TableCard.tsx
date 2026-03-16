import { useState } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import Add from '@mui/icons-material/Add';
import Remove from '@mui/icons-material/Remove';
import { glassCard } from '../theme/glassStyles';
import type { SeatAddress } from './SeatingChart';

const MIN_GROUP_SIZE = 3;
const MAX_GROUP_SIZE = 5;

const baseSeatCellSx = {
  py: 1,
  px: 0.5,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(0, 0, 0, 0.1)',
  borderRadius: '8px',
  minHeight: 40,
  minWidth: 0,
  overflow: 'hidden',
  transition: 'border-color 0.15s ease, background 0.15s ease',
};

interface TableCardProps {
  tableNumber: number;
  tableIndex: number;
  students: string[];
  groupSize: number;
  onGroupSizeChange: (size: number) => void;
  onSeatDrop: (source: SeatAddress, target: SeatAddress) => void;
}

interface SeatCellProps {
  name: string;
  tableIndex: number;
  seatIndex: number;
  onSeatDrop: (source: SeatAddress, target: SeatAddress) => void;
  inactive?: boolean;
  sx?: Record<string, unknown>;
}

function SeatCell({ name, tableIndex, seatIndex, onSeatDrop, inactive, sx }: SeatCellProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const address: SeatAddress = { type: 'table', tableIndex, seatIndex };
  const hasName = name !== '';
  const isDraggable = hasName;

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) return;
    e.dataTransfer.setData('application/json', JSON.stringify(address));
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const source: SeatAddress = JSON.parse(e.dataTransfer.getData('application/json'));
      onSeatDrop(source, address);
    } catch { /* ignore invalid data */ }
  };

  return (
    <Box
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        ...baseSeatCellSx,
        ...sx,
        cursor: isDraggable ? 'grab' : 'default',
        ...(inactive && {
          border: '1px dashed rgba(0, 0, 0, 0.08)',
        }),
        ...(isDragging && {
          opacity: 0.4,
          background: 'rgba(144, 238, 144, 0.3)',
          border: '1px dashed rgba(60, 160, 60, 0.5)',
          cursor: 'grabbing',
        }),
        ...(isDragOver && {
          background: 'rgba(173, 216, 230, 0.4)',
          border: '2px solid rgba(30, 90, 180, 0.7)',
        }),
      }}
    >
      <Typography
        variant="body2"
        noWrap
        sx={{ fontSize: '13px', color: inactive ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.7)', textAlign: 'center', userSelect: 'none', pointerEvents: 'none', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}
      >
        {name}
      </Typography>
    </Box>
  );
}

export default function TableCard({
  tableNumber,
  tableIndex,
  students,
  groupSize,
  onGroupSizeChange,
  onSeatDrop,
}: TableCardProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') return;
    const val = parseInt(raw, 10);
    if (!isNaN(val)) {
      onGroupSizeChange(Math.min(MAX_GROUP_SIZE, Math.max(MIN_GROUP_SIZE, val)));
    }
  };

  // Build seat layout based on group size
  // Size 5: seatIndex 0 = extra top seat, 1–4 = grid (TL, TR, BL, BR)
  // Size 3: BL cell is inactive (dashed placeholder) but still a valid drop target
  // Size 4: all 4 grid cells active
  const extraSeat = groupSize === 5 ? { name: students[0] ?? '', seatIndex: 0 } : null;

  const gridOffset = groupSize === 5 ? 1 : 0;
  const isInactiveSeat = (gridIndex: number) => groupSize === 3 && gridIndex === 3; // BR cell
  const gridSeats = Array.from({ length: 4 }, (_, i) => ({
    name: students[gridOffset + i] ?? '',
    seatIndex: gridOffset + i,
    inactive: isInactiveSeat(i),
  }));

  return (
    <Box sx={{ ...glassCard as Record<string, unknown>, p: 1.5, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, color: 'rgba(0, 0, 0, 0.75)' }}
        >
          Team {tableNumber}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <IconButton
            size="small"
            disabled={groupSize <= MIN_GROUP_SIZE}
            onClick={() => onGroupSizeChange(Math.max(MIN_GROUP_SIZE, groupSize - 1))}
            sx={{ color: 'rgba(0, 0, 0, 0.5)', p: 0.5 }}
          >
            <Remove fontSize="small" />
          </IconButton>
          <InputBase
            value={groupSize}
            onChange={handleInputChange}
            inputProps={{
              min: MIN_GROUP_SIZE,
              max: MAX_GROUP_SIZE,
              type: 'number',
              sx: {
                textAlign: 'center',
                p: 0,
                width: 28,
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'rgba(0, 0, 0, 0.7)',
                MozAppearance: 'textfield',
                '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0,
                },
              },
            }}
          />
          <IconButton
            size="small"
            disabled={groupSize >= MAX_GROUP_SIZE}
            onClick={() => onGroupSizeChange(Math.min(MAX_GROUP_SIZE, groupSize + 1))}
            sx={{ color: 'rgba(0, 0, 0, 0.5)', p: 0.5 }}
          >
            <Add fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Divider sx={{ mb: 1, borderColor: 'rgba(255, 255, 255, 0.5)' }} />

      {/* Seats area — pushes to bottom when no 5th seat */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        {/* Extra seat above grid (group size 5 only) */}
        {extraSeat && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.75 }}>
            <SeatCell
              name={extraSeat.name}
              tableIndex={tableIndex}
              seatIndex={extraSeat.seatIndex}
              onSeatDrop={onSeatDrop}
              sx={{ width: '50%' }}
            />
          </Box>
        )}

        {/* 2x2 grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.75 }}>
          {gridSeats.map((seat) => (
            <SeatCell
              key={seat.seatIndex}
              name={seat.name}
              tableIndex={tableIndex}
              seatIndex={seat.seatIndex}
              onSeatDrop={onSeatDrop}
              inactive={seat.inactive}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
