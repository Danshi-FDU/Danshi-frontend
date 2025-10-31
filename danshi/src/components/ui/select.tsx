import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/src/context/theme_context';
import { Body } from '@/src/components/ui/typography';

export type SelectOption = { label: string; value: string };

export type SelectProps = {
  label?: string;
  placeholder?: string;
  value?: string | null;
  onChange?: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

const Select: React.FC<SelectProps> = ({
  label,
  placeholder,
  value,
  onChange,
  options,
  disabled,
  size = 'md',
}) => {
  const { text, icon, tint, card, effective } = useTheme();
  const [open, setOpen] = useState(false);

  const dims =
    size === 'lg'
      ? { height: 48, paddingHorizontal: 14, fontSize: 16 }
      : size === 'sm'
      ? { height: 36, paddingHorizontal: 12, fontSize: 14 }
      : { height: 44, paddingHorizontal: 12, fontSize: 15 };

  const displayLabel = useMemo(() => {
    const found = options.find((o) => o.value === value);
    return found?.label ?? value ?? placeholder ?? '';
  }, [options, value, placeholder]);

  return (
    <View style={{ width: '100%' }}>
      {label ? (
        <Body style={{ marginBottom: 6 }} emphasis>
          {label}
        </Body>
      ) : null}
      <TouchableOpacity
        disabled={disabled}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        style={[
          styles.field,
          {
            borderColor: icon as string,
            height: dims.height,
            paddingHorizontal: dims.paddingHorizontal,
          },
          disabled && { opacity: 0.6 },
        ]}
      >
        <Text style={{ color: value ? (text as string) : (icon as string), fontSize: dims.fontSize }} numberOfLines={1}>
          {displayLabel || placeholder || ''}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: card as string }]}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView style={{ maxHeight: 320 }}>
              {options.map((opt) => {
                const selected = opt.value === value;
                const selectedBg = effective === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.option, selected && { backgroundColor: selectedBg }]}
                    onPress={() => {
                      setOpen(false);
                      onChange?.(opt.value);
                    }}
                  >
                    <Text style={{ color: selected ? (tint as string) : (text as string), fontSize: 15 }}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[styles.cancel, { borderTopColor: effective === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]} onPress={() => setOpen(false)}>
              <Text style={{ color: icon as string, fontSize: 14 }}>取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: 24,
    justifyContent: 'center',
  },
  sheet: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cancel: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
});

export default Select;
