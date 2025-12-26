
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const API_KEY = process.env.API_KEY || '';

export async function analyzeImageFor3D(base64Image: string): Promise<AnalysisResult> {
  if (!API_KEY) {
    return {
      summary: "Defaulting to high-quality presets.",
      suggestedSettings: { smoothing: 2, resolution: 160 },
      useCase: "General 3D Object"
    };
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Image.split(',')[1] || base64Image,
            },
          },
          {
            text: `Analyze this image for 3D conversion. Is it noisy? Does it have sharp edges or organic curves? 
            Return optimized settings:
            - resolution (128-256 for detail)
            - smoothing (0 for technical/sharp, 1-5 for organic/noisy)
            - heightScale (3-15mm)
            - invert (true if dark areas should be higher)
            Provide a 1-sentence summary of your structural strategy.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            suggestedSettings: {
              type: Type.OBJECT,
              properties: {
                heightScale: { type: Type.NUMBER },
                resolution: { type: Type.NUMBER },
                invert: { type: Type.BOOLEAN },
                smoothing: { type: Type.NUMBER }
              }
            },
            useCase: { type: Type.STRING }
          },
          required: ["summary", "suggestedSettings", "useCase"]
        }
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      summary: "Manual tuning recommended for best results.",
      suggestedSettings: { smoothing: 1 },
      useCase: "Custom STL"
    };
  }
}
