import React from 'react';
import { View, ScrollView, ViewProps, ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing } from '@/src/constants/theme';
import { useTheme } from '@/src/hooks/use_theme';
import Container from '@/src/components/ui/container';
import { H2 } from '@/src/components/ui/typography';

export type ScreenProps = {
  variant?: 'plain' | 'scroll';
  withContainer?: boolean; // whether to wrap children with Container
  title?: string; // optional title rendered at top
  topPadding?: number; // override top padding if needed
  children: React.ReactNode;
  contentProps?: ViewProps | ScrollViewProps;
};

function calcTopPad(insetTop: number) {
  // Ensure comfortable space under status bar / notch with extra spacing.
  return Math.max(insetTop, Spacing.md) + Spacing.lg; // e.g., ~ (safeArea or 12) + 16
}

export const Screen: React.FC<ScreenProps> = ({
  variant = 'plain',
  withContainer = true,
  title,
  topPadding,
  children,
  contentProps,
}) => {
  const { background } = useTheme();
  const insets = useSafeAreaInsets();
  const padTop = topPadding ?? calcTopPad(insets.top);

  const Inner = (
    <>
      {title ? (
        <H2 style={{ marginBottom: Spacing.md }}>{title}</H2>
      ) : null}
      {children}
    </>
  );

  if (variant === 'scroll') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: background }}
        contentContainerStyle={{ paddingTop: padTop, paddingBottom: Spacing.lg }}
        {...(contentProps as ScrollViewProps)}
      >
        {withContainer ? <Container>{Inner}</Container> : Inner}
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: background, paddingTop: padTop }} {...(contentProps as ViewProps)}>
      {withContainer ? <Container>{Inner}</Container> : Inner}
    </View>
  );
};

export default Screen;
