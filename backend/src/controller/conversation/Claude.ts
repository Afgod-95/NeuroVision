//not used
import { Request, Response } from 'express';
import ClaudeAIService from '../../services/ClaudeAI';
import supabase from '../../lib/supabase';


// Initialize Claude AI service
const claudeAI = new ClaudeAIService({
  apiKey: process.env.CLAUDE_AI_API_KEY!,
  model: 'claude-3-sonnet-20240229', // or claude-3-haiku-20240307 for faster responses
  maxTokens: 2048,
  temperature: 0.7
});

interface ChatRequest {
  userId: number;
  message: string;
  conversationId: string;
  includeHistory?: boolean;
  systemPrompt?: string;
}

interface SupabaseMessage {
  id: string;
  conversation_id: string;
  user_id: number;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { userId, message, conversationId, includeHistory = true, systemPrompt }: ChatRequest = req.body;

    // Validate required fields
    if (!userId || !message || !conversationId) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, message, or conversationId' 
      });
    }

    // Validate environment variables
    if (!process.env.CLAUDE_AI_API_KEY) {
      console.error('CLAUDE_AI_API_KEY is not set');
      return res.status(500).json({ error: 'Claude AI service not configured' });
    }

    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Fetch conversation history if requested
    if (includeHistory) {
      try {
        const { data: historyMessages, error: historyError } = await supabase
          .from('messages')
          .select('sender, content, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(20); 

        if (historyError) {
          console.warn('Failed to fetch conversation history:', historyError);
        } else if (historyMessages) {
          conversationHistory = historyMessages
            .filter(msg => msg.sender !== 'system')
            .map(msg => ({
              role: msg.sender as 'user' | 'assistant',
              content: (() => {
                try {
                  const parsed = JSON.parse(msg.content);
                  return parsed.text || msg.content;
                } catch {
                  return msg.content;
                }
              })()
            }));
        }
      } catch (error) {
        console.warn('Error fetching conversation history:', error);
      }
    }

    // Generate AI response using Claude
    console.log('Sending message to Claude AI...');
    const aiResponse = await claudeAI.sendMessageWithContext(
      message,
      systemPrompt || "You are NeuroVision, a helpful AI assistant. Provide clear, concise, and helpful responses to users.",
      conversationHistory
    );

    console.log('Claude AI response received:', aiResponse);

    // Save AI response to Supabase
    const { data: savedMessage, error: saveError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        sender: 'assistant',
        content: aiResponse,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving AI response to Supabase:', saveError);
      return res.status(500).json({ 
        error: 'Failed to save AI response',
        details: saveError.message 
      });
    }

    // Return the AI response
    res.status(200).json({
      success: true,
      message: aiResponse,
      messageId: savedMessage.id,
      timestamp: savedMessage.created_at
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);

    // Handle specific Claude AI errors
    if (error.message && error.message.includes('Claude AI')) {
      return res.status(502).json({ 
        error: 'AI service error', 
        details: error.message 
      });
    }

    // Handle rate limiting
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        details: 'Please wait before sending another message' 
      });
    }

    // Generic error response
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};