// Web fallback for expo-image-picker
export const launchImageLibraryAsync = async () => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        resolve({
          canceled: false,
          assets: [{ uri: URL.createObjectURL(file), type: file.type, fileName: file.name }]
        });
      } else {
        resolve({ canceled: true });
      }
    };
    input.click();
  });
};
export const launchCameraAsync = async () => {
  alert('Camera is not available on web');
  return { canceled: true };
};
export const MediaTypeOptions = { Images: 'Images' };
export default { launchImageLibraryAsync, launchCameraAsync, MediaTypeOptions };
