type DimensionsType = {
  imgWidth: number;
  imgHeight: number;
  maxWidth: number;
  maxHeight: number;
};

export default function calculateDimensions({
  imgWidth,
  imgHeight,
  maxWidth,
  maxHeight,
}: DimensionsType) {
  const aspectRatio = imgWidth / imgHeight;
  let width = maxWidth;
  let height = maxHeight;

  if (imgWidth > imgHeight) {
    // Landscape image
    if (imgWidth > maxWidth) {
      width = maxWidth;
      height = maxWidth / aspectRatio;
    }
  } else {
    // Portrait image
    if (imgHeight > maxHeight) {
      height = maxHeight;
      width = maxHeight * aspectRatio;
    }
  }

  return { width, height };
}
