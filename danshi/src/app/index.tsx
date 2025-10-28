import React from 'react';
import { Redirect } from 'expo-router';

export default function RootIndex() {
  // Avoid redirect loop by pointing to a concrete tab route
  return <Redirect href="/explore" />;
}
