import React, { createContext, useContext, useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useColorScheme as useRNColorScheme } from 'react-native'
import { MD3DarkTheme, MD3LightTheme, useTheme as usePaperTheme, MD3Theme } from 'react-native-paper'

// Types
export type ThemeMode = 'light' | 'dark' | 'system'
export type ThemeColors = MD3Theme['colors']

type ThemeContextValue = {
  mode: ThemeMode
  effective: 'light' | 'dark'
  setMode: (m: ThemeMode) => Promise<void>
  toggle: () => Promise<void>
}

const KEY = 'appThemeMode'

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function useSystemColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false)
  useEffect(() => setHasHydrated(true), [])
  const cs = useRNColorScheme()
  if (hasHydrated) return cs
  return 'light'
}

export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const system = useSystemColorScheme() ?? 'light'
  const [mode, setModeState] = useState<ThemeMode>('system')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY)
        if (raw === 'light' || raw === 'dark' || raw === 'system') setModeState(raw)
      } catch (e) {
        // ignore
      }
      setIsReady(true)
    }
    load()
  }, [])

  const setMode = async (m: ThemeMode) => {
    try {
      await AsyncStorage.setItem(KEY, m)
    } catch (e) {
      // ignore
    }
    setModeState(m)
  }

  const toggle = async () => {
    const next = mode === 'dark' ? 'light' : 'dark'
    await setMode(next as ThemeMode)
  }

  const effective = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode

  if (!isReady) {
    const bg = effective === 'dark' ? MD3DarkTheme.colors.background : MD3LightTheme.colors.background
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} />
  }

  return <ThemeContext.Provider value={{ mode, effective, setMode, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')

  const { effective } = ctx
  const paper = usePaperTheme()
  const colors: ThemeColors = paper.colors

  return {
    colors,
    text: colors.onSurface,
    tint: colors.primary,
    card: colors.surface,
    danger: colors.error,
    icon: colors.secondary,
    background: colors.background,
    tabIconDefault: colors.outline,
    mode: ctx.mode,
    effective: ctx.effective,
    setMode: ctx.setMode,
    toggle: ctx.toggle,
  }
}

export default useTheme
