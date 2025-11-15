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

  const { danger } = useTheme();

  return (
    <KeyboardAvoidingView style={[styles.container, { padding: pad }]} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <StatusBar style="auto" />
      <View style={[styles.centerWrap, { padding: pad }]}> 
        <View style={{ width: '100%', maxWidth }}>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="headlineSmall" style={styles.title}>登录</Text>
              {error ? <Text style={{ color: danger, marginBottom: 8 }}>{error}</Text> : null}

              <View style={{ gap: 12 }}>
                <TextInput
                  label="邮箱或用户名"
                  mode="outlined"
                  autoCapitalize="none"
                  value={identifier}
                  onChangeText={setIdentifier}
                />

                <TextInput
                  label="密码"
                  mode="outlined"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <Button mode="contained" style={{ marginTop: 12 }} onPress={onSubmit} loading={loading}>
                登录
              </Button>

              <View style={styles.row}>
                <Text>没有账号？</Text>
                <Button mode="text" onPress={() => router.push('/register')} style={{ marginLeft: 8 }}>
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
});
