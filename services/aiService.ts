
import { GoogleGenAI } from "@google/genai";
import { AISuggestionType } from "../types";

export class AIService {
  async getSuggestion(type: AISuggestionType, context: { title: string; content: string }) {
    // Initializing GenAI inside the method to ensure it uses the latest process.env values
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-pro-preview';
    
    let prompt = "";
    switch (type) {
      case 'OPTIMIZE_TITLE':
        prompt = `Based on this blog post content, suggest 5 catchy and SEO-friendly titles. 
        Content: ${context.content.substring(0, 2000)}
        Return only the titles as a bulleted list.`;
        break;
      case 'SUMMARIZE':
        prompt = `Summarize this blog post in 2-3 sentences for a social media preview.
        Title: ${context.title}
        Content: ${context.content.substring(0, 3000)}`;
        break;
      case 'EXPAND':
        prompt = `Expand the following points into a detailed, professional blog paragraph. 
        Points: ${context.content}`;
        break;
      case 'FIX_GRAMMAR':
        prompt = `Fix the grammar and improve the flow of this text while maintaining its meaning.
        Text: ${context.content}`;
        break;
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 2000 }
        }
      });
      // response.text is a getter property, not a function.
      return response.text || "No suggestion could be generated at this time.";
    } catch (error) {
      console.error("Gemini AI Error:", error);
      throw new Error("AI assistant encountered an error. Please ensure your API configuration is correct.");
    }
  }
}
