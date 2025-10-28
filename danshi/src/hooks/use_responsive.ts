import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { breakpoints } from '@/src/constants/breakpoints';

export function useResponsive() {
  const { width, height, scale, fontScale } = useWindowDimensions();

  const bp = useMemo(() => {
    const w = width;
    return {
      width: w,
      height,
      scale,
      fontScale,
      isSM: w >= breakpoints.sm,
      isMD: w >= breakpoints.md,
      isLG: w >= breakpoints.lg,
      isXL: w >= breakpoints.xl,
      current: (w >= breakpoints.xl
        ? 'xl'
        : w >= breakpoints.lg
        ? 'lg'
        : w >= breakpoints.md
        ? 'md'
        : w >= breakpoints.sm
        ? 'sm'
        : 'base') as 'base' | 'sm' | 'md' | 'lg' | 'xl',
    };
  }, [width, height, scale, fontScale]);

  return bp;
}
