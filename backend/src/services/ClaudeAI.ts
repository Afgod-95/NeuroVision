// services/claudeAI.ts
import axios from 'axios';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  id: string;
  model: string;
  role: 'assistant';
  stop_reason: string;
  stop_sequence: null;
  type: 'message';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface ClaudeAIConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

class ClaudeAIService {
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private baseURL = 'https://api.anthropic.com/v1/messages';

  constructor(config: ClaudeAIConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-3-sonnet-20240229';
    this.maxTokens = config.maxTokens || 1024;
    this.temperature = config.temperature || 0.7;
  }

  async sendMessage(
    message: string, 
    conversationHistory: ClaudeMessage[] = []
  ): Promise<string> {
    try {
      const messages: ClaudeMessage[] = [
        ...conversationHistory,
        { role: 'user', content: message }
      ];

      const response = await axios.post<ClaudeResponse>(
        this.baseURL,
        {
          model: this.model,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          messages: messages
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );

      if (response.data.content && response.data.content.length > 0) {
        return response.data.content[0].text;
      }

      throw new Error('No content received from Claude AI');
    } catch (error: any) {
      console.error('Claude AI API Error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid Claude AI API key');
      } else if (error.response?.status === 429) {
        throw new Error('Claude AI rate limit exceeded. Please try again later.');
      } else if (error.response?.status === 400) {
        throw new Error('Invalid request to Claude AI');
      }
      
      throw new Error(`Claude AI error: ${error.message}`);
    }
  }

  async sendMessageWithContext(
    message: string,
    systemPrompt?: string,
    conversationHistory: ClaudeMessage[] = []
  ): Promise<string> {
    try {
      const messages: ClaudeMessage[] = [...conversationHistory];
      
      // Add system prompt as first user message if provided
      if (systemPrompt && messages.length === 0) {
        messages.push({ role: 'user', content: systemPrompt });
        messages.push({ role: 'assistant', content: 'I understand. I\'ll help you with that.' });
      }
      
      messages.push({ role: 'user', content: message });

      return await this.sendMessage(message, messages);
    } catch (error) {
      throw error;
    }
  }
}

export default ClaudeAIService;