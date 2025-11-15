import { MD3DarkTheme, MD3LightTheme, MD3Theme } from 'react-native-paper'

export function getMD3Theme(mode: 'light' | 'dark'): MD3Theme {
  return mode === 'dark' ? MD3DarkTheme : MD3LightTheme
}
