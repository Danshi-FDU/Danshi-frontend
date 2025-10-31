import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/context/theme_context';

export type AvatarDropzoneProps = {
  value?: string | null;
  onChange?: (uri: string) => void;
  width?: number;
  height?: number;
  borderRadius?: number;
  label?: string;
  hint?: string;
};

const AvatarDropzone: React.FC<AvatarDropzoneProps> = ({
  value,
  onChange,
  width = 120,
  height = 120,
  borderRadius = 12,
  label = '拖拽图片到这里上传',
  hint = '仅 Web 支持拖拽，移动端可粘贴 URL',
}) => {
  const { text, icon, tint, card } = useTheme();
  const idRef = useRef(`dropzone-${Math.random().toString(36).slice(2)}`);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = document.getElementById(idRef.current);
    if (!el) return;

    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const onDragOver = (e: DragEvent) => { prevent(e); setOver(true); };
    const onDragLeave = (e: DragEvent) => { prevent(e); setOver(false); };
    const onDrop = (e: DragEvent) => {
      prevent(e);
      setOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      onChange?.(url);
    };

    el.addEventListener('dragover', onDragOver);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('drop', onDrop);
    el.addEventListener('dragenter', prevent);
    el.addEventListener('dragend', prevent);

    return () => {
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('dragleave', onDragLeave);
      el.removeEventListener('drop', onDrop);
      el.removeEventListener('dragenter', prevent);
      el.removeEventListener('dragend', prevent);
    };
  }, [onChange]);

  return (
    <View>
      <View
        id={idRef.current as any}
        style={[
          styles.box,
          {
            width,
            height,
            borderRadius,
            borderColor: over ? tint : icon,
            backgroundColor: card as string,
          },
        ]}
      >
        {value ? (
          (Platform.OS === 'web' ? (
            <img src={value} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius }} />
          ) : null)
        ) : (
          <>
            <Text style={{ color: text as string, fontSize: 14 }}>{label}</Text>
            <Text style={{ color: icon as string, fontSize: 12, marginTop: 6 }}>{hint}</Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default AvatarDropzone;
