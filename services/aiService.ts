
import { GoogleGenAI } from "@google/genai";
import { AISuggestionType, AppSettings } from "../types";

export class AIService {
  private settings: AppSettings;

  constructor(settings: AppSettings) {
    this.settings = settings;
  }

  async getSuggestion(type: AISuggestionType, context: { title: string; content: string }) {
    const errors: string[] = [];

    // --- STEP 1: TMDB PRIORITY FOR MOVIE DETAILS ---
    if (type === 'FETCH_MOVIE_DETAILS') {
      if (this.settings.tmdbApiKey) {
        try {
          console.log("Searching TMDB for:", context.title);
          const tmdbData = await this.callTMDB(context.title);
          if (tmdbData) {
            console.log("TMDB Data Found!");
            return { text: JSON.stringify(tmdbData), grounding: [] };
          }
          errors.push("TMDB: Movie not found in database.");
        } catch (e: any) {
          console.warn("TMDB error:", e.message);
          errors.push(`TMDB Error: ${e.message}`);
        }
      } else {
        errors.push("TMDB: API Key not configured in settings.");
      }
    }

    // --- STEP 2: AI FALLBACKS ---
    
    // 1. Try Gemini (Primary AI)
    // Only try if the system-provided API_KEY exists
    if (process.env.API_KEY) {
      try {
        console.log("Attempting with Gemini...");
        return await this.callGemini(type, context);
      } catch (e: any) {
        console.warn("Gemini failed:", e.message);
        errors.push(`Gemini: ${e.message}`);
      }
    } else {
      errors.push("Gemini: System API key (API_KEY) is missing.");
    }

    // 2. Try OpenAI (ChatGPT)
    if (this.settings.openAiApiKey) {
      try {
        console.log("Attempting with OpenAI fallback...");
        return await this.callOpenAI(type, context);
      } catch (e: any) {
        console.warn("OpenAI failed:", e.message);
        errors.push(`OpenAI: ${e.message}`);
      }
    }

    // 3. Try Grok (X.AI)
    if (this.settings.grokApiKey) {
      try {
        console.log("Attempting with Grok fallback...");
        return await this.callGrok(type, context);
      } catch (e: any) {
        console.warn("Grok failed:", e.message);
        errors.push(`Grok: ${e.message}`);
      }
    }

    // --- FINAL ERROR REPORTING ---
    const errorMsg = errors.length > 0 
      ? `সবগুলো মাধ্যম ব্যর্থ হয়েছে:\n${errors.join('\n')}`
      : "কোনো এপিআই (TMDB বা AI) কনফিগার করা নেই।";
      
    throw new Error(errorMsg);
  }

  private async callTMDB(title: string) {
    const apiKey = this.settings.tmdbApiKey;
    if (!apiKey) return null;

    // Remove year from title if user included it in brackets like (2024) to improve search accuracy
    const cleanTitle = title.replace(/\(\d{4}\)/g, '').trim();

    // 1. Search for the movie/tv show
    const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}&language=en-US`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      if (searchRes.status === 401) throw new Error("Invalid TMDB API Key.");
      throw new Error(`TMDB API returned ${searchRes.status}`);
    }
    const searchData = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) {
      return null; 
    }

    // Prioritize movies over TV shows in search results if multiple results found
    let result = searchData.results.find((r: any) => r.media_type === 'movie') || searchData.results[0];
    const id = result.id;
    const mediaType = result.media_type === 'person' ? 'movie' : (result.media_type || 'movie');

    // 2. Get detailed info including credits
    const detailsUrl = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${apiKey}&append_to_response=credits`;
    const detailsRes = await fetch(detailsUrl);
    if (!detailsRes.ok) return null;
    const details = await detailsRes.json();

    // Map TMDB data to our MovieTemplateData format
    return {
      genre: (details.genres || []).map((g: any) => g.name).join(', '),
      imdb: details.vote_average ? details.vote_average.toFixed(1) : "N/A",
      plot: details.overview || "No plot summary available.",
      director: details.credits?.crew?.find((c: any) => c.job === 'Director')?.name || "N/A",
      cast: (details.credits?.cast || []).slice(0, 5).map((c: any) => c.name).join(', '),
      budget: details.budget ? `$${(details.budget / 1000000).toFixed(1)} Million` : "N/A",
      releaseDate: details.release_date || details.first_air_date || "N/A",
      language: details.spoken_languages?.[0]?.english_name || details.original_language || "English",
      posterUrl: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : ""
    };
  }

  private async callGemini(type: AISuggestionType, context: { title: string; content: string }) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-flash-preview';
    
    let prompt = this.getPrompt(type, context);
    let tools: any[] | undefined = undefined;

    // Use Google Search grounding only for movie details to get latest data
    if (type === 'FETCH_MOVIE_DETAILS') {
      tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools,
        // Disable JSON MIME type if using tools/grounding as it might conflict
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
      throw new Error(err.error?.message || `OpenAI error ${response.status}`);
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
      throw new Error(err.error?.message || `Grok error ${response.status}`);
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
      Return strictly JSON: {"genre": "", "imdb": "", "plot": "", "director": "", "cast": "", "budget": "", "releaseDate": "", "language": "", "posterUrl": ""}. 
      Ensure "plot" is 3-4 sentences. "cast" as comma-separated string. Use a real movie poster URL if found on web.`;
    }
    
    switch (type) {
      case 'OPTIMIZE_TITLE': return `Suggest 5 catchy SEO titles for this movie post: ${context.content.substring(0, 500)}`;
      case 'SUMMARIZE': return `Write a short interesting plot for: ${context.title}`;
      case 'FIX_GRAMMAR': return `Fix the grammar and spelling while keeping the movie tone: ${context.content}`;
      default: return `Help with movie content: ${context.title}`;
    }
  }
}
