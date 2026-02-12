
import { GoogleGenAI } from "@google/genai";
import { AISuggestionType, AppSettings } from "../types";

export class AIService {
  private settings: AppSettings;

  constructor(settings: AppSettings) {
    this.settings = settings;
  }

  async getSuggestion(type: AISuggestionType, context: { title: string; content: string }) {
    const errors: string[] = [];

    // 1. Try Gemini first
    if (this.settings.geminiApiKey) {
      try {
        console.log("Attempting with Gemini...");
        return await this.callGemini(type, context);
      } catch (e: any) {
        console.warn("Gemini failed:", e.message);
        errors.push(`Gemini: ${e.message}`);
      }
    }

    // 2. Try OpenAI (ChatGPT) as fallback
    if (this.settings.openAiApiKey) {
      try {
        console.log("Attempting with OpenAI...");
        return await this.callOpenAI(type, context);
      } catch (e: any) {
        console.warn("OpenAI failed:", e.message);
        errors.push(`OpenAI: ${e.message}`);
      }
    }

    // 3. Try Grok (X.AI) as fallback
    if (this.settings.grokApiKey) {
      try {
        console.log("Attempting with Grok...");
        return await this.callGrok(type, context);
      } catch (e: any) {
        console.warn("Grok failed:", e.message);
        errors.push(`Grok: ${e.message}`);
      }
    }

    if (errors.length === 0) {
      throw new Error("কোনো এপিআই কি (API Key) সেট করা নেই। সেটিংস থেকে কি যোগ করুন।");
    }

    throw new Error(`সবগুলো এআই প্রোভাইডার ব্যর্থ হয়েছে:\n${errors.join('\n')}`);
  }

  private async callGemini(type: AISuggestionType, context: { title: string; content: string }) {
    const ai = new GoogleGenAI({ apiKey: this.settings.geminiApiKey });
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
        // When using tools, we shouldn't force JSON mime type in Gemini
        responseMimeType: (type === 'FETCH_MOVIE_DETAILS' || tools) ? undefined : "application/json",
      },
    });

    return {
      text: response.text || (type === 'FETCH_MOVIE_DETAILS' ? "{}" : ""),
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
      const err = await response.json();
      throw new Error(err.error?.message || "OpenAI error");
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
      const err = await response.json();
      throw new Error(err.error?.message || "Grok error");
    }

    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      grounding: []
    };
  }

  private getPrompt(type: AISuggestionType, context: { title: string; content: string }) {
    if (type === 'FETCH_MOVIE_DETAILS') {
      return `Search the web and provide detailed information for the movie or series: "${context.title}". 
      I need the response strictly in JSON format with these exact keys: 
      "genre", "imdb", "plot", "director", "cast", "budget", "releaseDate", "language".
      Ensure the "plot" is about 3-4 sentences. "cast" should be a list of main actors.
      If some info is not found, use "N/A". Return ONLY the JSON object.`;
    }
    
    switch (type) {
      case 'OPTIMIZE_TITLE':
        return `Suggest 5 catchy SEO titles for: ${context.content.substring(0, 500)}`;
      case 'SUMMARIZE':
        return `Write a short movie plot summary for: ${context.title}`;
      case 'FIX_GRAMMAR':
        return `Fix grammar errors in this text: ${context.content}`;
      default:
        return `Help me with this movie content: ${context.title}`;
    }
  }
}
