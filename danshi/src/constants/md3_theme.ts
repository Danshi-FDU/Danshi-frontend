import { MD3DarkTheme, MD3LightTheme, MD3Theme } from 'react-native-paper'
import { Colors } from '@/src/constants/theme'

export function getMD3Theme(mode: 'light' | 'dark'): MD3Theme {
  const isDark = mode === 'dark'
  const base = isDark ? MD3DarkTheme : MD3LightTheme
  const c = isDark ? Colors.dark : Colors.light

  // Map existing app colors to MD3 tokens
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.tint, // brand color
      secondary: c.icon,
      background: c.background,
      surface: c.card,
      surfaceVariant: c.card,
      error: c.danger,
      onPrimary: '#FFFFFF',
      onSecondary: isDark ? '#000000' : '#000000',
      onBackground: c.text,
      onSurface: c.text,
      onError: '#FFFFFF',
      outline: isDark ? '#8A7E78' : '#C7BDB6',
    },
  }
}
