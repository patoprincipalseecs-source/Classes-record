#!/bin/bash

# Fix async-storage imports
find app -name "*.tsx" -type f -exec sed -i 's|@react-native-async-storage/async-storage|@/lib/webStorage|g' {} \;

# Fix keyboard controller imports
find app -name "*.tsx" -type f -exec sed -i 's|react-native-keyboard-controller|react-native|g' {} \;

# Fix screen orientation imports - comment out
find app -name "*.tsx" -type f -exec sed -i 's|import.*ScreenOrientation.*from "expo-screen-orientation";|// Web: ScreenOrientation disabled|g' {} \;

# Replace any ScreenOrientation usage
find app -name "*.tsx" -type f -exec sed -i 's/ScreenOrientation\./\/\/ ScreenOrientation./g' {} \;

# Fix haptics for web
find app -name "*.tsx" -type f -exec sed -i 's|import \* as Haptics from "expo-haptics";|// Web: Haptics disabled\nconst Haptics = { impactAsync: () => {}, selectionAsync: () => {} };|g' {} \;

echo "Web imports fixed!"
