import React from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';

// Web fallback that uses regular ScrollView
export const KeyboardAwareScrollView = (props: ScrollViewProps) => {
  return <ScrollView {...props} />;
};
