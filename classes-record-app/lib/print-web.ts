// Web fallback for expo-print
export const printAsync = async () => {
  window.print();
};
export const printToFileAsync = async () => ({ uri: '' });
export default { printAsync, printToFileAsync };
