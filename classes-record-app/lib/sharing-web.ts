// Web fallback for expo-sharing
export const isAvailableAsync = async () => false;
export const shareAsync = async () => {
  console.log('Sharing is not available on web');
  alert('File sharing is not available on web. Use desktop version for this feature.');
};
export default { isAvailableAsync, shareAsync };
