module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            'expo-sharing': './lib/sharing-web',
            'expo-file-system': './lib/filesystem-web',
            'expo-document-picker': './lib/document-picker-web',
            'expo-image-picker': './lib/image-picker-web',
            'expo-location': './lib/location-web',
            'expo-print': './lib/print-web',
            'expo-haptics': './lib/haptics-web',
            'expo-screen-orientation': './lib/orientation-web',
            '@react-native-async-storage/async-storage': './lib/webStorage',
            'react-native-keyboard-controller': 'react-native'
          }
        }
      ]
    ]
  };
};
