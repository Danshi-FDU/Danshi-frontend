import React, { useEffect, useRef } from 'react';
import { Modal, View, StyleSheet, Pressable, Animated, Easing, Platform, KeyboardAvoidingView } from 'react-native';
import { useTheme } from '@/src/context/theme_context';

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number; // default auto, otherwise fixed height
};

export const BottomSheet: React.FC<BottomSheetProps> = ({ visible, onClose, children, height }) => {
  const { card } = useTheme();
  const translateY = useRef(new Animated.Value(1)).current; // 1 -> hidden, 0 -> shown

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : 1,
      duration: 220,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const backdropOpacity = translateY.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });
  const sheetTranslate = translateY.interpolate({ inputRange: [0, 1], outputRange: [0, 40] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[styles.backdrop, { backgroundColor: '#000', opacity: backdropOpacity }]} />
        </Pressable>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: card,
              transform: [{ translateY: sheetTranslate }],
            },
            height ? { height } : undefined,
          ]}
        >
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 16,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'card',
    marginBottom: 8,
  },
});

export default BottomSheet;
