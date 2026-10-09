/**
 * Image resizing utility for browser uploads (FR-36)
 * Resizes photo to longest side 2048px (full) and 400px (thumbnail)
 */

export interface ResizedImageResult {
  fullDataUrl: string;
  thumbDataUrl: string;
  width: number;
  height: number;
}

export function resizeImage(file: File): Promise<ResizedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const origWidth = img.width;
        const origHeight = img.height;

        // Calculate 2048px bounding dimensions
        const maxFull = 2048;
        let fullWidth = origWidth;
        let fullHeight = origHeight;
        if (origWidth > maxFull || origHeight > maxFull) {
          if (origWidth >= origHeight) {
            fullWidth = maxFull;
            fullHeight = Math.round((origHeight * maxFull) / origWidth);
          } else {
            fullHeight = maxFull;
            fullWidth = Math.round((origWidth * maxFull) / origHeight);
          }
        }

        // Draw full
        const canvasFull = document.createElement('canvas');
        canvasFull.width = fullWidth;
        canvasFull.height = fullHeight;
        const ctxFull = canvasFull.getContext('2d');
        if (!ctxFull) {
          reject(new Error('Canvas context not available'));
          return;
        }
        ctxFull.drawImage(img, 0, 0, fullWidth, fullHeight);
        const fullDataUrl = canvasFull.toDataURL('image/jpeg', 0.88);

        // Calculate 400px thumb dimensions
        const maxThumb = 400;
        let thumbWidth = origWidth;
        let thumbHeight = origHeight;
        if (origWidth >= origHeight) {
          thumbWidth = maxThumb;
          thumbHeight = Math.round((origHeight * maxThumb) / origWidth);
        } else {
          thumbHeight = maxThumb;
          thumbWidth = Math.round((origWidth * maxThumb) / origHeight);
        }

        const canvasThumb = document.createElement('canvas');
        canvasThumb.width = thumbWidth;
        canvasThumb.height = thumbHeight;
        const ctxThumb = canvasThumb.getContext('2d');
        if (!ctxThumb) {
          reject(new Error('Canvas context not available'));
          return;
        }
        ctxThumb.drawImage(img, 0, 0, thumbWidth, thumbHeight);
        const thumbDataUrl = canvasThumb.toDataURL('image/jpeg', 0.82);

        resolve({
          fullDataUrl,
          thumbDataUrl,
          width: fullWidth,
          height: fullHeight,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
