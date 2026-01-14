
import { GoogleGenAI } from "@google/genai";

/**
 * Performs OCR on a base64 encoded image using Gemini Flash.
 * Uses process.env.API_KEY directly for initialization as per guidelines.
 */
export async function performOCR(base64Image: string): Promise<{ text: string }> {
  // Initialize Gemini API client directly with process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image.split(',')[1], // Remove the data:image/jpeg;base64, prefix
    },
  };

  const textPart = {
    text: `Perform high-accuracy OCR on this image. 
    Focus specifically on identifying any phone numbers. 
    Return the full raw text content detected in the image.`
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, textPart] },
    });

    // Directly access .text property from GenerateContentResponse
    return {
      text: response.text || ''
    };
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
}
