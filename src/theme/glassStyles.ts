import type { SxProps, Theme } from '@mui/material/styles';

export const glassCard: SxProps<Theme> = {
  background: 'rgba(255, 255, 255, 0.25)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.4)',
  borderRadius: '20px',
  boxShadow:
    '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
  transition: 'box-shadow 0.2s ease',
  '&:hover': {
    boxShadow:
      '0 12px 40px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
  },
};

export const glassPanel: SxProps<Theme> = {
  background: 'rgba(255, 255, 255, 0.35)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.4)',
  borderRadius: '16px',
  boxShadow:
    '0 4px 16px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
};
