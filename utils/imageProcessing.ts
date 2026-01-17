// Implement image to base64 conversion and advanced phone number extraction logic
export const preprocessImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract the base64 string from the data URL format
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Extracts Indian mobile numbers from text and formats them to 91XXXXXXXXXX
 */
export function extractAndFormatNumbers(text: string): string[] {
  // Regex for 10-digit Indian numbers, potentially with spaces/dashes and country code prefixes
  // Matches: 9656 50 1307, +919656501307, 09656501307, etc.
  // Look for 10 digits starting with 6, 7, 8, or 9
  const regex = /(?:(?:\+|0{0,2})91[\s-]?)?([6789][\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d)/g;
  
  const matches = Array.from(text.matchAll(regex));
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
