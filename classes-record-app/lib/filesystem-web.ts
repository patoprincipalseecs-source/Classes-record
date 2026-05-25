// Web fallback for expo-file-system
export const documentDirectory = null;
export const cacheDirectory = null;
export const readAsStringAsync = async () => '';
export const writeAsStringAsync = async () => {};
export const deleteAsync = async () => {};
export const getInfoAsync = async () => ({ exists: false });
export const downloadAsync = async () => ({ uri: '' });
export default {
  documentDirectory,
  cacheDirectory,
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
  getInfoAsync,
  downloadAsync
};
