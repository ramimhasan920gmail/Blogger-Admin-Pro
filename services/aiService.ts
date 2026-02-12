
import { GoogleGenAI, Type } from "@google/genai";
import { AISuggestionType } from "../types";

export class AIService {
  async getSuggestion(type: AISuggestionType, context: { title: string; content: string }) {
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      throw new Error("Gemini API Key missing.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3-pro-preview';
    
    let prompt = "";
    let tools: any[] | undefined = undefined;

    if (type === 'FETCH_MOVIE_DETAILS') {
      tools = [{ googleSearch: {} }];
      prompt = `Search the web and provide detailed information for the movie or series: "${context.title}". 
      I need the response strictly in JSON format with these exact keys: 
      "genre", "imdb", "plot", "director", "cast", "budget".
      Ensure the "plot" is about 3-4 sentences. "cast" should be a list of main actors.
      If some info is not found, use "N/A".`;
    } else {
      switch (type) {
        case 'OPTIMIZE_TITLE':
          prompt = `Suggest 5 catchy SEO titles for: ${context.content.substring(0, 500)}`;
          break;
        case 'SUMMARIZE':
          prompt = `Write a plot summary for: ${context.title}`;
          break;
        case 'FIX_GRAMMAR':
          prompt = `Fix grammar: ${context.content}`;
          break;
        default:
          prompt = `Help with: ${context.title}`;
      }
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          tools,
          responseMimeType: type === 'FETCH_MOVIE_DETAILS' ? "application/json" : undefined,
        },
      });

      // Handle grounding metadata for search usage
      const groundingLinks = response.candidates?.[0]?.groundingMetadata?.searchEntryPoint?.html;
      
      return {
        text: response.text || "{}",
        grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      };
    } catch (error) {
      console.error("AI Error:", error);
      throw new Error("Gemini AI failed to fetch data.");
    }
  }
}
