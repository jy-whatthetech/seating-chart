import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { glassPanel } from '../theme/glassStyles';
import type { SeatAddress } from './SeatingChart';

const slotSx = {
  py: 1,
  px: 1.5,
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

interface UnassignedPanelProps {
  names: string[];
  onSeatDrop: (source: SeatAddress, target: SeatAddress) => void;
  maxHeight?: number;
}

interface SlotProps {
  name: string;
  index: number;
  onSeatDrop: (source: SeatAddress, target: SeatAddress) => void;
  isAppendZone?: boolean;
}

function Slot({ name, index, onSeatDrop, isAppendZone }: SlotProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const address: SeatAddress = { type: 'unassigned', index };
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
        ...slotSx,
        cursor: isDraggable ? 'grab' : 'default',
        ...(isAppendZone && !isDragOver && {
          border: '1px dashed rgba(0, 0, 0, 0.1)',
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
        sx={{
          color: hasName ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.25)',
          textAlign: 'center',
          userSelect: 'none',
          pointerEvents: 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}
      >
        {hasName ? name : 'Drop here'}
      </Typography>
    </Box>
  );
}

export default function UnassignedPanel({ names, onSeatDrop, maxHeight }: UnassignedPanelProps) {
  return (
    <Box
      sx={{
        ...glassPanel as Record<string, unknown>,
        width: 200,
        flexShrink: 0,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        ...(maxHeight !== undefined && { maxHeight }),
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 700,
          color: 'rgba(0, 0, 0, 0.6)',
          letterSpacing: 1,
          textAlign: 'center',
          mb: 0.5,
          flexShrink: 0,
        }}
      >
        Unassigned Names
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
        {names.map((name, i) => (
          <Slot key={i} name={name} index={i} onSeatDrop={onSeatDrop} />
        ))}

        {/* Always show an append drop zone */}
        <Slot
          name=""
          index={names.length}
          onSeatDrop={onSeatDrop}
          isAppendZone
        />
      </Box>
    </Box>
  );
}
