import React from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';

export function KeyboardAwareScrollView(props: ScrollViewProps & { children?: React.ReactNode }) {
  return <ScrollView {...props} />;
}

export function KeyboardProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export default KeyboardAwareScrollView;
