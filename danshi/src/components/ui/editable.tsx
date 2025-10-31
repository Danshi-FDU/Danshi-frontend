import React, { useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Body } from '@/src/components/ui/typography';
import { useTheme } from '@/src/context/theme_context';
import Card from '@/src/components/ui/card';
import Button from '@/src/components/ui/button';
import Input from '@/src/components/ui/input';
import Select from '@/src/components/ui/select';
import AvatarDropzone from '@/src/components/ui/avatar_dropzone';

export type EditableBaseProps = {
  label: string;
  errorText?: string;
  initialEditing?: boolean;
  onToggleEditing?: (editing: boolean) => void;
  editing?: boolean; // provided to control editing state
};

export type EditableTextRowProps = EditableBaseProps & {
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onSave: (next: string) => Promise<void> | void;
};

export const EditableTextRow: React.FC<EditableTextRowProps> = ({
  label,
  value,
  placeholder,
  multiline,
  onSave,
  initialEditing = false,
  errorText,
  onToggleEditing,
  editing: controlledEditing,
}) => {
  const { text, icon } = useTheme();
  const [editing, setEditing] = useState(initialEditing);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (typeof controlledEditing === 'boolean') setEditing(controlledEditing);
  }, [controlledEditing]);

  const showText = useMemo(() => (value?.trim() ? value : '暂无'), [value]);

  const startEdit = () => {
    setDraft(value ?? '');
    setErr('');
    setEditing(true);
    onToggleEditing?.(true);
  };
  const cancel = () => {
    setDraft(value ?? '');
    setEditing(false);
    onToggleEditing?.(false);
  };
  const save = async () => {
    try {
      setLoading(true);
      setErr('');
      await onSave(draft);
      setEditing(false);
      onToggleEditing?.(false);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padded style={{ marginTop: 12 }}>
      <View style={styles.headerRow}>
        <Body emphasis>{label}</Body>
        {!editing ? (
          <TouchableOpacity onPress={startEdit} accessibilityLabel={`编辑${label}`}>
            <Ionicons name="pencil-outline" size={18} color={text as string} />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={{ height: 8 }} />
      {!editing ? (
        <Body style={{ color: icon as string }}>{showText}</Body>
      ) : (
        <>
          <Input value={draft} onChangeText={setDraft} placeholder={placeholder} multiline={multiline} />
          <View style={styles.actionsRow}>
            <Button title="取消" variant="secondary" size="sm" onPress={cancel} style={{ marginRight: 8 }} />
            <Button title="保存" size="sm" loading={loading} onPress={save} />
          </View>
          {err ? <Body style={{ marginTop: 6, color: 'useTheme().danger' }}>{err}</Body> : null}
          {errorText ? <Body style={{ marginTop: 6, color: 'useTheme().danger' }}>{errorText}</Body> : null}
        </>
      )}
    </Card>
  );
};

export type EditableSelectRowProps = EditableBaseProps & {
  value: string;
  placeholder?: string;
  options: { label: string; value: string }[];
  onSave: (next: string) => Promise<void> | void;
};

export const EditableSelectRow: React.FC<EditableSelectRowProps> = ({
  label,
  value,
  placeholder,
  options,
  onSave,
  initialEditing = false,
  errorText,
  onToggleEditing,
  editing: controlledEditing,
}) => {
  const { text, icon } = useTheme();
  const [editing, setEditing] = useState(initialEditing);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(value);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (typeof controlledEditing === 'boolean') setEditing(controlledEditing);
  }, [controlledEditing]);

  const labelText = useMemo(() => {
    const found = options.find((o) => o.value === value);
    return found?.label ?? value ?? '暂无';
  }, [options, value]);

  const startEdit = () => {
    setDraft(value);
    setErr('');
    setEditing(true);
    onToggleEditing?.(true);
  };
  const cancel = () => {
    setDraft(value);
    setEditing(false);
    onToggleEditing?.(false);
  };
  const save = async () => {
    try {
      setLoading(true);
      setErr('');
      await onSave(draft);
      setEditing(false);
      onToggleEditing?.(false);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padded style={{ marginTop: 12 }}>
      <View style={styles.headerRow}>
        <Body emphasis>{label}</Body>
        {!editing ? (
          <TouchableOpacity onPress={startEdit} accessibilityLabel={`编辑${label}`}>
            <Ionicons name="pencil-outline" size={18} color={text as string} />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={{ height: 8 }} />
      {!editing ? (
        <Body style={{ color: icon as string }}>{labelText}</Body>
      ) : (
        <>
          <Select label={undefined} value={draft} placeholder={placeholder} options={options} onChange={setDraft} />
          <View style={styles.actionsRow}>
            <Button title="取消" variant="secondary" size="sm" onPress={cancel} style={{ marginRight: 8 }} />
            <Button title="保存" size="sm" loading={loading} onPress={save} />
          </View>
          {err ? <Body style={{ marginTop: 6, color: '#d33' }}>{err}</Body> : null}
          {errorText ? <Body style={{ marginTop: 6, color: '#d33' }}>{errorText}</Body> : null}
        </>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
});

export type EditableAvatarRowProps = EditableBaseProps & {
  value?: string | null;
  onSave: (nextUri: string | null) => Promise<void> | void;
};

export const EditableAvatarRow: React.FC<EditableAvatarRowProps> = ({ label, value, onSave, initialEditing, onToggleEditing }) => {
  const { text, icon } = useTheme();
  const [editing, setEditing] = useState(!!initialEditing);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<string | null>(value ?? null);
  const [err, setErr] = useState('');

  const startEdit = () => { setDraft(value ?? null); setErr(''); setEditing(true); onToggleEditing?.(true); };
  const cancel = () => { setDraft(value ?? null); setEditing(false); onToggleEditing?.(false); };
  const save = async () => {
    try {
      setLoading(true);
      setErr('');
      await onSave(draft ?? '');
      setEditing(false);
      onToggleEditing?.(false);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padded style={{ marginTop: 12 }}>
      <View style={styles.headerRow}>
        <Body emphasis>{label}</Body>
        {!editing ? (
          <TouchableOpacity onPress={startEdit} accessibilityLabel={`编辑${label}`}>
            <Ionicons name="pencil-outline" size={18} color={text as string} />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={{ height: 8 }} />
      {!editing ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, overflow: 'hidden', backgroundColor: (useTheme().card as string), borderWidth: StyleSheet.hairlineWidth, borderColor: (useTheme().icon as string) }}>
            {/* @ts-ignore web-only */}
            {value ? <img src={value} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
          </View>
          <Body style={{ marginLeft: 12, color: icon as string }}>{value || '（未设置，使用自动头像）'}</Body>
        </View>
      ) : (
        <>
          <AvatarDropzone value={draft ?? undefined} onChange={(u) => setDraft(u)} />
          <View style={styles.actionsRow}>
            <Button title="取消" variant="secondary" size="sm" onPress={cancel} style={{ marginRight: 8 }} />
            <Button title="保存" size="sm" loading={loading} onPress={save} />
          </View>
          {err ? <Body style={{ marginTop: 6, color: '#d33' }}>{err}</Body> : null}
        </>
      )}
    </Card>
  );
};

export default { EditableTextRow, EditableSelectRow, EditableAvatarRow };
