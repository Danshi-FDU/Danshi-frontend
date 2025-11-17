import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/src/context/theme_context';
import { useAuth } from '@/src/context/auth_context';
import { router } from 'expo-router';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import { authService } from '@/src/services/auth_service';
import { useBreakpoint } from '@/src/hooks/use_media_query';
import { pickByBreakpoint } from '@/src/constants/breakpoints';
import { REGEX } from '../constants/app';

export default function LoginScreen() {
  const bp = useBreakpoint();
  const pad = pickByBreakpoint(bp, { base: 16, sm: 20, md: 24, lg: 32, xl: 40 });
  const maxWidth = pickByBreakpoint(bp, { base: 440, sm: 480, md: 560, lg: 640, xl: 720 });
  const [identifier, setIdentifier] = useState(''); // email or username
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!identifier) return '请输入邮箱或用户名';
    const ok = REGEX.EMAIL.test(identifier) || REGEX.USERNAME.test(identifier);
    if (!ok) return '请输入有效的邮箱或用户名';
    if (!password) return '请输入密码';
    return '';
  };

  const { signIn } = useAuth();

  const onSubmit = async () => {
    setError('');
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    try {
      const { token } = await authService.login({ identifier, password });
      await signIn(token);
      // 直接跳到 tabs 的探索页，避免在 (auth) 栈内 REPLACE('index') 报错
      router.replace('/explore');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const { danger, colors } = useTheme();
  const palette = colors as unknown as Record<string, string>;
  const surfaceContainerLow = palette.surfaceContainerLow ?? colors.background;
  const cardBorderColor = palette.outlineVariant ?? colors.outline;
  const rowPromptColor = palette.onSurfaceVariant ?? colors.onSurface;
  const inputTheme = { roundness: 10 };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingHorizontal: pad, backgroundColor: surfaceContainerLow }]}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <StatusBar style="auto" />
      <View style={styles.centerWrap}> 
        <View style={{ width: '100%', maxWidth }}>
          <Card
            mode="outlined"
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: cardBorderColor,
                borderWidth: 1,
              },
            ]}
          >
            <Card.Content>
              <Text variant="headlineSmall" style={[styles.title, { color: colors.onSurface }]}>
                登录
              </Text>
              {error ? <Text style={{ color: danger, marginBottom: 8 }}>{error}</Text> : null}

              <View style={{ gap: 20 }}>
                <TextInput
                  label="邮箱或用户名"
                  mode="outlined"
                  autoCapitalize="none"
                  value={identifier}
                  onChangeText={setIdentifier}
                  outlineColor={colors.surfaceVariant}
                  activeOutlineColor={colors.primary}
                  textColor={colors.onSurface}
                  theme={inputTheme}
                />

                <TextInput
                  label="密码"
                  mode="outlined"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  outlineColor={colors.surfaceVariant}
                  activeOutlineColor={colors.primary}
                  textColor={colors.onSurface}
                  theme={inputTheme}
                />
              </View>

              <Button
                mode="contained"
                style={{ marginTop: 35, borderRadius: 12 }}
                contentStyle={{ height: 48 }}
                onPress={onSubmit}
                loading={loading}
                buttonColor={colors.primary}
                textColor={colors.onPrimary}
              >
                登录
              </Button>

              <View style={styles.row}>
                <Text style={[styles.rowPrompt, { color: rowPromptColor }]}>没有账号？</Text>
                <Button
                  mode="text"
                  compact
                  onPress={() => router.push('/register')}
                  style={[styles.rowLink, { borderColor: colors.outline, borderRadius: 10 }]}
                  contentStyle={styles.rowLinkContent}
                  textColor={colors.primary}
                >
                  注册
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'transparent',
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {},
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  rowPrompt: {
    fontSize: 15,
    lineHeight: 36,
  },
  rowLink: {
    marginLeft: 0,
    alignSelf: 'center',
  },
  rowLinkContent: {
    height: 36,
  },
});
