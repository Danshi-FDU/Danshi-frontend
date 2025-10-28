import { useWindowDimensions } from 'react-native';
import { breakpoints, type Breakpoint, type BreakpointKey } from '@/src/constants/breakpoints';

export function useViewport() {
  const { width, height, scale, fontScale } = useWindowDimensions();
  return { width, height, scale, fontScale };
}

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'base';
}

export function useMinWidth(bp: BreakpointKey) {
  const { width } = useWindowDimensions();
  return width >= breakpoints[bp];
}

export function useMaxWidth(bp: BreakpointKey) {
  const { width } = useWindowDimensions();
  return width < breakpoints[bp];
}
