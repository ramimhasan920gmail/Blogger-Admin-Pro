
import { GoogleGenAI } from "@google/genai";
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
    switch (type) {
      case 'OPTIMIZE_TITLE':
        prompt = `Based on this content, suggest 5 catchy SEO titles for a movie/series blog post. 
        Content: ${context.content.substring(0, 1000)}
        Focus on release year and download quality. Return as bulleted list.`;
        break;
      case 'SUMMARIZE':
        prompt = `Write a professional 3-sentence plot summary for a movie blog.
        Title: ${context.title}
        Raw Content: ${context.content.substring(0, 2000)}`;
        break;
      case 'FIX_GRAMMAR':
        prompt = `Correct the grammar and flow of this movie description:
        Text: ${context.content}`;
        break;
      default:
        prompt = `Help me with this blog post: ${context.title}`;
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      return response.text || "No response generated.";
    } catch (error) {
      console.error("AI Error:", error);
      throw new Error("Gemini AI failed.");
    }
  }
}
