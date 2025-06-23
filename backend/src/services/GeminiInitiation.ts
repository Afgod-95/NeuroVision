import GeminiAIService from "./GeminiAI";
// Initialize Gemini service 
const geminiService = new GeminiAIService({
    apiKey: process.env.GEMINI_API_KEY || "",
    model: "gemini-2.5-flash",
    maxTokens: 8192,
    temperature: 0.7
});

export default geminiService;