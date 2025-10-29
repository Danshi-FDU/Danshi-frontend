import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/src/context/auth_context';
import { useTheme } from '@/src/context/theme_context';
import Container from '@/src/components/ui/container';
import { router } from 'expo-router';
import Card from '@/src/components/ui/card';
import { H2, Body } from '@/src/components/ui/typography';
import Button from '@/src/components/ui/button';
import Input from '@/src/components/ui/input';
import { authService } from '@/src/services/auth_service';
import { useBreakpoint } from '@/src/hooks/use_media_query';
import { pickByBreakpoint } from '@/src/constants/breakpoints';
import { REGEX } from '../constants/app';

export default function RegisterScreen() {
  const bp = useBreakpoint();
  const pad = pickByBreakpoint(bp, { base: 16, sm: 20, md: 24, lg: 32, xl: 40 });
  const maxWidth = pickByBreakpoint(bp, { base: 440, sm: 480, md: 560, lg: 640, xl: 720 });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');

  const validate = () => {
    if (!username) return '请输入用户名';
    if (username.trim().length < 3) return '用户名至少 3 个字符';
    if (!email) return '请输入邮箱';
    const emailRegex = REGEX.EMAIL;
    if (!emailRegex.test(email)) return '请输入有效的邮箱地址';
    if (!password) return '请输入密码';
    if (password.length < 8) return '密码长度至少 8 位';
    if (password !== confirm) return '两次输入的密码不一致';
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
  const { token } = await authService.register({ email, password, name: username });
  await signIn(token);
  router.replace('/');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const { danger } = useTheme();

  return (
    <KeyboardAvoidingView style={[styles.container, { padding: pad }]} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <StatusBar style="auto" />
      <Container maxWidth={maxWidth}>
        <Card padded>
          <H2 style={styles.title}>注册</H2>
          {error ? <Body style={{ color: danger, marginBottom: 8 }}>{error}</Body> : null}

          <View style={{ gap: 12 }}>
            <Input
              placeholder="用户名"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <Input
              placeholder="邮箱"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Input
              placeholder="密码"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Input
              placeholder="确认密码"
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
            />

          </View>

          <Button title="创建账号" variant="primary" style={{ marginTop: 12 }} onPress={onSubmit} loading={loading} />

          <View style={styles.row}>
            <Body>已有账号？</Body>
            <Button title="登录" variant="secondary" size="sm" onPress={() => router.push('/login')} style={{ marginLeft: 8 }} />
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
