// Web fallback for expo-location
export const requestForegroundPermissionsAsync = async () => ({ status: 'denied' });
export const getCurrentPositionAsync = async () => ({
  coords: { latitude: 0, longitude: 0, accuracy: 0 }
});
export default { requestForegroundPermissionsAsync, getCurrentPositionAsync };
