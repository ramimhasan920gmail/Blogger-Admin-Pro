
import { GoogleGenAI } from "@google/genai";
import { AISuggestionType } from "../types";

export class AIService {
  private apiKey: string;

  constructor(userApiKey?: string) {
    // এপিআই কি-তে কোনো অদৃশ্য স্পেস থাকলে তা রিমুভ করবে
    this.apiKey = (userApiKey || process.env.API_KEY || '').trim();
  }

  async getSuggestion(type: AISuggestionType, context: { title: string; content: string }) {
    if (!this.apiKey) {
      throw new Error("Gemini API Key পাওয়া যায়নি। সেটিংস থেকে কি (Key) যোগ করুন।");
    }

    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });
      
      // 'gemini-3-flash-preview' সার্চ টুল এবং কোটার জন্য বেশি স্থিতিশীল
      const modelName = 'gemini-3-flash-preview';
      
      let prompt = "";
      let tools: any[] | undefined = undefined;

      if (type === 'FETCH_MOVIE_DETAILS') {
        // গুগল সার্চ গ্রাউন্ডিং যোগ করা হয়েছে
        tools = [{ googleSearch: {} }];
        prompt = `Search the web and provide detailed information for the movie or series: "${context.title}". 
        I need the response strictly in JSON format with these exact keys: 
        "genre", "imdb", "plot", "director", "cast", "budget", "releaseDate", "language".
        Ensure the "plot" is about 3-4 sentences. "cast" should be a list of main actors.
        If some info is not found, use "N/A". Return ONLY the JSON object string.`;
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
        model: modelName,
        contents: prompt,
        config: {
          tools,
          // ক্রুশিয়াল: টুল ব্যবহার করলে responseMimeType: 'application/json' ব্যবহার করা যাবে না।
          // তাই আমরা এখানে শর্ত সাপেক্ষে এটি দিচ্ছি।
          responseMimeType: (type === 'FETCH_MOVIE_DETAILS' || tools) ? undefined : "application/json",
        },
      });

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      return {
        text: response.text || (type === 'FETCH_MOVIE_DETAILS' ? "{}" : ""),
        grounding: groundingChunks
      };
    } catch (error: any) {
      console.error("Gemini API Error details:", error);
      
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        throw new Error("আপনার ফ্রি এপিআই কোটা (Quota) সাময়িকভাবে শেষ। দয়া করে ১ মিনিট অপেক্ষা করে আবার চেষ্টা করুন।");
      }
      
      if (error.message?.includes('400') && error.message?.includes('mime type')) {
        throw new Error("এআই সার্ভারে কনফিগারেশন সমস্যা। টুল এবং জেএসন মোড একসাথে কাজ করছে না। ডেভেলপারকে জানান।");
      }

      if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('Headers')) {
        throw new Error("আপনার এপিআই কি (API Key) সঠিক নয়। সেটিংস থেকে পুনরায় সঠিক কি দিন।");
      }

      throw new Error(error.message || "এআই এর সাথে যোগাযোগ করতে সমস্যা হচ্ছে।");
    }
  }
}
