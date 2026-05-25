import React from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';

export function KeyboardAwareScrollView(props: ScrollViewProps) {
  return <ScrollView {...props} />;
}

export default KeyboardAwareScrollView;
