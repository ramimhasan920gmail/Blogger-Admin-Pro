
import { GoogleGenAI } from "@google/genai";
import { AISuggestionType } from "../types";

export class AIService {
  private apiKey: string;

  constructor(userApiKey?: string) {
    // Trim the API key to remove any accidental newlines or spaces
    this.apiKey = (userApiKey || process.env.API_KEY || '').trim();
  }

  async getSuggestion(type: AISuggestionType, context: { title: string; content: string }) {
    if (!this.apiKey) {
      throw new Error("Gemini API Key missing. Please go to Settings and add your API Key.");
    }

    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });
      // Using gemini-3-flash-preview for better quota availability and speed
      const model = 'gemini-3-flash-preview';
      
      let prompt = "";
      let tools: any[] | undefined = undefined;

      if (type === 'FETCH_MOVIE_DETAILS') {
        tools = [{ googleSearch: {} }];
        prompt = `Search the web and provide detailed information for the movie or series: "${context.title}". 
        I need the response strictly in JSON format with these exact keys: 
        "genre", "imdb", "plot", "director", "cast", "budget", "releaseDate", "language".
        Ensure the "plot" is about 3-4 sentences. "cast" should be a list of main actors.
        If some info is not found, use "N/A". Return ONLY the JSON object.`;
      } else {
        switch (type) {
          case 'OPTIMIZE_TITLE':
            prompt = `Suggest 5 catchy SEO titles for: ${context.content.substring(0, 500)}`;
            break;
          case 'SUMMARIZE':
            prompt = `Write a short movie plot summary for: ${context.title}`;
            break;
          case 'FIX_GRAMMAR':
            prompt = `Fix grammar errors in this text: ${context.content}`;
            break;
          default:
            prompt = `Help me with this movie content: ${context.title}`;
        }
      }

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          tools,
          responseMimeType: type === 'FETCH_MOVIE_DETAILS' ? "application/json" : undefined,
        },
      });

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      return {
        text: response.text || (type === 'FETCH_MOVIE_DETAILS' ? "{}" : ""),
        grounding: groundingChunks
      };
    } catch (error: any) {
      console.error("Gemini API Error details:", error);
      
      // Handle Quota Exceeded error (429)
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        throw new Error("AI Quota Exceeded. Please wait a few seconds or try a different API Key.");
      }
      
      // Catching the specific header error
      if (error.message?.includes('Headers') || error.message?.includes('ISO-8859-1')) {
        throw new Error("Invalid API Key format. Please re-copy your key and ensure no spaces are added.");
      }

      throw new Error(error.message || "Failed to communicate with Gemini AI.");
    }
  }
}
