import React, { PropsWithChildren, ReactElement } from 'react';
import ParallaxScrollView from '@/src/components/parallax_scroll_view';
import Container from '@/src/components/ui/container';
import { H2 } from '@/src/components/ui/typography';
import { Spacing } from '@/src/constants/theme';
import { ThemeColors } from '@/src/context/theme_context';

export type ParallaxScreenProps = PropsWithChildren<{
  title?: string;
  headerImage: ReactElement;
  headerBackgroundColor?: { dark: string; light: string };
  headerColorKey?: keyof ThemeColors;
  withContainer?: boolean;
}>;

export default function ParallaxScreen({
  title,
  headerImage,
  headerBackgroundColor,
  headerColorKey,
  withContainer = true,
  children,
}: ParallaxScreenProps) {
  const Inner = (
    <>
      {title ? <H2 style={{ marginBottom: Spacing.md }}>{title}</H2> : null}
      {children}
    </>
  );

  return (
    <ParallaxScrollView
      headerImage={headerImage}
      headerBackgroundColor={headerBackgroundColor}
      headerColorKey={headerColorKey}
    >
      {withContainer ? <Container>{Inner}</Container> : Inner}
    </ParallaxScrollView>
  );
}
