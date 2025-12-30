
import { GoogleGenAI, Type } from "@google/genai";
import { Merchant, AnomalyReport } from "../types";

export const analyzeRestaurantStatus = async (merchant: Merchant): Promise<AnomalyReport> => {
  // Always initialize GoogleGenAI inside the call to ensure the latest process.env.API_KEY is used.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const now = new Date();
  const currentTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });

  const prompt = `
    Restaurant Name: ${merchant.name}
    Current Local Time: ${currentTime}
    Current Day: ${currentDay}
    Current Status on iFood: ${merchant.status}
    Official Working Hours: ${JSON.stringify(merchant.hours)}

    Task:
    Analyze if the current status is an anomaly. 
    1. If the restaurant is CLOSED or PAUSED during its scheduled OPEN hours, it's a high-severity anomaly (potential sabotage or mistake).
    2. If it's OPEN outside scheduled hours, flag it as a low-severity anomaly.
    3. If status matches schedule, it's not an anomaly.

    Provide a professional reasoning.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isAnomaly: { type: Type.BOOLEAN },
            severity: { 
                type: Type.STRING,
                description: "One of: low, medium, high"
            },
            reason: { type: Type.STRING },
            recommendation: { type: Type.STRING }
          },
          required: ["isAnomaly", "severity", "reason", "recommendation"]
        }
      }
    });

    // Safely parse the response text
    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      isAnomaly: merchant.status !== merchant.expectedStatus,
      severity: 'medium',
      reason: 'Failed to perform AI analysis, using basic logic matching.',
      recommendation: 'Contact the store manager immediately to verify status.'
    };
  }
};
