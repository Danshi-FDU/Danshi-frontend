import React, { createContext, useContext, useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useColorScheme as useRNColorScheme } from 'react-native'
import { Colors } from '@/src/constants/theme'

// Types
export type ThemeMode = 'light' | 'dark' | 'system'
export type ThemeColors = typeof Colors.light

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
    const bg = effective === 'dark' ? Colors.dark.background : Colors.light.background
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} />
  }

  return <ThemeContext.Provider value={{ mode, effective, setMode, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')

  const { effective } = ctx
  const colors: ThemeColors = Colors[effective]

  return {
    colors,
    text: colors.text,
    tint: colors.tint,
    card: colors.card,
    danger: colors.danger,
    icon: colors.icon,
    background: colors.background,
    mode: ctx.mode,
    effective: ctx.effective,
    setMode: ctx.setMode,
    toggle: ctx.toggle,
  }
}

export default useTheme
