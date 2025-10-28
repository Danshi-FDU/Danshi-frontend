import React from 'react';
import { Platform, Pressable, type GestureResponderEvent } from 'react-native';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';

type Props = React.ComponentProps<typeof Pressable> & { href: string };

export function ExternalLink({ href, onPress, ...rest }: Props) {
  const handlePress: NonNullable<Props['onPress']> = async (event: GestureResponderEvent) => {
    try {
      if (onPress) onPress(event);
      if (event.defaultPrevented) return;
      if (Platform.OS === 'web') {
        window.open(href, '_blank');
      } else {
        await openBrowserAsync(href, { presentationStyle: WebBrowserPresentationStyle.AUTOMATIC });
      }
    } catch (e) {
      // noop: swallow open errors
    }
  };

  return <Pressable accessibilityRole="link" onPress={handlePress} {...rest} />;
}
