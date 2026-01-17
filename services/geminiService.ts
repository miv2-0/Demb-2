// Implement Gemini-powered OCR using the @google/genai SDK
import { GoogleGenAI } from "@google/genai";

export const performOCR = async (base64Image: string): Promise<{ text: string }> => {
  // Initialize the Gemini client using the mandatory API_KEY environment variable
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use gemini-3-flash-preview for optimized speed and high accuracy in text extraction tasks
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
        {
          text: 'Analyze this image and perform complete text extraction. Pay specific attention to identifying any mobile or phone numbers for data processing.',
        },
      ],
    },
  });

  // Access the text property directly from the response as per the latest SDK guidelines
  return { 
    text: response.text || "" 
  };
};
