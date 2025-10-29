import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/src/context/theme_context';
import Container from '@/src/components/ui/container';
import { useAuth } from '@/src/context/auth_context';
import { router } from 'expo-router';
import Card from '@/src/components/ui/card';
import { H2, Body } from '@/src/components/ui/typography';
import Button from '@/src/components/ui/button';
import Input from '@/src/components/ui/input';
import { authService } from '@/src/services/auth_service';
import { useBreakpoint } from '@/src/hooks/use_media_query';
import { pickByBreakpoint } from '@/src/constants/breakpoints';
import { REGEX } from '../constants/app';

export default function LoginScreen() {
  const bp = useBreakpoint();
  const pad = pickByBreakpoint(bp, { base: 16, sm: 20, md: 24, lg: 32, xl: 40 });
  const maxWidth = pickByBreakpoint(bp, { base: 440, sm: 480, md: 560, lg: 640, xl: 720 });
  const [identifier, setIdentifier] = useState(''); // mail or name
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!identifier) return '请输入邮箱';
    const emailRegex = REGEX.EMAIL;
    if (!emailRegex.test(identifier)) return '请输入有效的邮箱地址';
    if (!password) return '请输入密码';
    if (password.length < 8) return '密码长度至少 8 位';
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
  const { token } = await authService.login({ email: identifier, password });
  await signIn(token);
  // jump to tabs root (index in tabs group resolves to "/")
  router.replace('/');
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
      <Container maxWidth={maxWidth}>
        <Card padded style={styles.card}> 
          <H2 style={styles.title}>登录</H2>
          {error ? <Body style={{ color: danger, marginBottom: 8 }}>{error}</Body> : null}

          <View style={{ gap: 12 }}>
            <Input
              placeholder="邮箱或用户名"
              autoCapitalize="none"
              value={identifier}
              onChangeText={setIdentifier}
            />

            <Input
              placeholder="密码"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Button title="登录" variant="primary" style={{ marginTop: 12 }} onPress={onSubmit} loading={loading} />

          <View style={styles.row}>
            <Body>没有账号？</Body>
            <Button title="注册" variant="secondary" size="sm" onPress={() => router.push('/register')} style={{ marginLeft: 8 }} />
          </View>
        </Card>
      </Container>
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
