import { Platform } from 'react-native';

// This automatically picks the correct version based on platform
let KeyboardAwareScrollView: any;

if (Platform.OS === 'web') {
  KeyboardAwareScrollView = require('./web/KeyboardAwareScrollView.web').KeyboardAwareScrollView;
} else {
  KeyboardAwareScrollView = require('./web/KeyboardAwareScrollView.native').KeyboardAwareScrollView;
}

export { KeyboardAwareScrollView };
