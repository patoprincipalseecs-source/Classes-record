// Web fallback for expo-document-picker
export const getDocumentAsync = async () => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        resolve({
          type: 'success',
          uri: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          mimeType: file.type
        });
      } else {
        resolve({ type: 'cancel' });
      }
    };
    input.click();
  });
};
export default { getDocumentAsync };
