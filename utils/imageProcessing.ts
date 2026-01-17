// Implement image to base64 conversion and robust Indian mobile extraction
export const preprocessImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Extracts Indian mobile numbers from text and formats them to 91XXXXXXXXXX.
 * Specifically targets numbers starting with 6, 7, 8, or 9.
 */
export function extractAndFormatNumbers(text: string): string[] {
  // Regex looks for 10-digit clusters starting with 6-9,
  // potentially preceded by +91, 91, or 0, with flexible spacing.
  const regex = /(?:(?:\+|0{0,2})91[\s-]?)?([6789][\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d)/g;
  
  const matches = Array.from(text.matchAll(regex));
  const results: string[] = [];

  for (const match of matches) {
    // Extract only the digits from the captured group
    const clean = match[1].replace(/\D/g, '');
    if (clean.length === 10) {
      results.push(`91${clean}`);
    }
  }

  // Deduplicate results for the current image
  return Array.from(new Set(results));
}