// Implement image to base64 conversion and phone number extraction logic
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

export const extractAndFormatNumbers = (text: string): string[] => {
  // Regex pattern to identify potential international and local mobile number formats
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const matches = text.match(phoneRegex) || [];
  
  // Normalize matches to digits only and filter for standard phone number lengths
  return matches
    .map(num => num.replace(/\D/g, ''))
    .filter(num => num.length >= 10 && num.length <= 15);
};
