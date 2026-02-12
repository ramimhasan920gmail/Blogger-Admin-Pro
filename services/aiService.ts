
import { GoogleGenAI } from "@google/genai";
import { AISuggestionType, AppSettings } from "../types";

export class AIService {
  private settings: AppSettings;

  constructor(settings: AppSettings) {
    this.settings = settings;
  }

  async getSuggestion(type: AISuggestionType, context: { title: string; content: string }) {
    const errors: string[] = [];

    // 1. Try Gemini first (Using system API Key exclusively)
    try {
      console.log("Attempting with Gemini (System API)...");
      return await this.callGemini(type, context);
    } catch (e: any) {
      console.warn("Gemini failed:", e.message);
      errors.push(`Gemini: ${e.message}`);
    }

    // 2. Try OpenAI (ChatGPT) as fallback
    if (this.settings.openAiApiKey) {
      try {
        console.log("Attempting with OpenAI fallback...");
        return await this.callOpenAI(type, context);
      } catch (e: any) {
        console.warn("OpenAI failed:", e.message);
        errors.push(`OpenAI: ${e.message}`);
      }
    }

    // 3. Try Grok (X.AI) as fallback
    if (this.settings.grokApiKey) {
      try {
        console.log("Attempting with Grok fallback...");
        return await this.callGrok(type, context);
      } catch (e: any) {
        console.warn("Grok failed:", e.message);
        errors.push(`Grok: ${e.message}`);
      }
    }

    const errorMsg = errors.length > 0 
      ? `সবগুলো এআই প্রোভাইডার ব্যর্থ হয়েছে:\n${errors.join('\n')}`
      : "কোনো এআই প্রোভাইডার কনফিগার করা নেই।";
      
    throw new Error(errorMsg);
  }

  private async callGemini(type: AISuggestionType, context: { title: string; content: string }) {
    // process.env.API_KEY is pre-configured and must be used directly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-flash-preview';
    
    let prompt = this.getPrompt(type, context);
    let tools: any[] | undefined = undefined;

    if (type === 'FETCH_MOVIE_DETAILS') {
      tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools,
        // responseMimeType: 'application/json' cannot be used with googleSearch
        responseMimeType: (type === 'FETCH_MOVIE_DETAILS' || tools) ? undefined : "application/json",
      },
    });

    return {
      text: response.text || "{}",
      grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  }

  private async callOpenAI(type: AISuggestionType, context: { title: string; content: string }) {
    const prompt = this.getPrompt(type, context);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.settings.openAiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: type === 'FETCH_MOVIE_DETAILS' ? { type: "json_object" } : undefined
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI status ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      grounding: []
    };
  }

  private async callGrok(type: AISuggestionType, context: { title: string; content: string }) {
    const prompt = this.getPrompt(type, context);
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.settings.grokApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "grok-beta",
        messages: [{ role: "user", content: prompt }],
        stream: false,
        temperature: 0
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Grok status ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      grounding: []
    };
  }

  private getPrompt(type: AISuggestionType, context: { title: string; content: string }) {
    if (type === 'FETCH_MOVIE_DETAILS') {
      return `Detailed movie/series info for: "${context.title}". 
      Return strictly JSON: {"genre": "", "imdb": "", "plot": "", "director": "", "cast": "", "budget": "", "releaseDate": "", "language": ""}. 
      Ensure "plot" is 3-4 sentences. "cast" as comma-separated string. No markdown formatting.`;
    }
    
    switch (type) {
      case 'OPTIMIZE_TITLE': return `5 SEO titles for: ${context.content.substring(0, 500)}`;
      case 'SUMMARIZE': return `Short plot for: ${context.title}`;
      case 'FIX_GRAMMAR': return `Fix grammar: ${context.content}`;
      default: return `Help with movie content: ${context.title}`;
    }
  }
}
