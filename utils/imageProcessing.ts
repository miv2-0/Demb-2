
/**
 * Processes an image for OCR enhancement.
 * Grayscale -> Contrast -> Sharpening
 */
export async function preprocessImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No context');

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // 1. Grayscale & Contrast enhancement
      const contrast = 1.2; // Adjust contrast factor
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

      for (let i = 0; i < data.length; i += 4) {
        // Grayscale (Luminance method)
        const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        
        // Contrast
        const newValue = factor * (avg - 128) + 128;
        
        data[i] = newValue;
        data[i + 1] = newValue;
        data[i + 2] = newValue;
      }
      ctx.putImageData(imageData, 0, 0);

      // 2. Simple Sharpening (using convolution if we wanted to be fancy, but simple high-pass works)
      // For web apps, we'll stick to a clean contrast-enhanced grayscale for Gemini, which is already very robust.
      
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Extracts Indian mobile numbers from text and formats them to 91XXXXXXXXXX
 */
export function extractAndFormatNumbers(text: string): string[] {
  // Regex for 10-digit Indian numbers, potentially with spaces/dashes and country code prefixes
  // Matches: 9656 50 1307, +919656501307, 09656501307, etc.
  // Look for 10 digits that might have separators
  const regex = /(?:(?:\+|0{0,2})91[\s-]?)?([6789][\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d)/g;
  
  const matches = text.matchAll(regex);
  const results: string[] = [];

  for (const match of matches) {
    // Remove all non-digit characters
    const clean = match[1].replace(/\D/g, '');
    if (clean.length === 10) {
      results.push(`91${clean}`);
    }
  }

  // Remove duplicates
  return Array.from(new Set(results));
}
