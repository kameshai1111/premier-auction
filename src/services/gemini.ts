
import { GoogleGenAI } from "@google/genai";
import { Player } from "../types";

export const getScoutReport = async (player: Player): Promise<string> => {
  try {
    // Fix: Ensure initialization uses the correct parameter structure and process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      // Fix: Use player.type instead of the non-existent player.position
      contents: `Generate a concise 2-sentence scouting report for Premier League player ${player.name} (${player.type}) from ${player.club} for an auction context. Highlight their key strength and auction value. Keep it professional and exciting.`,
    });
    // Fix: Access response text as a property
    return response.text || "No scouting report available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The scout is currently unavailable, but this player is a top talent.";
  }
};