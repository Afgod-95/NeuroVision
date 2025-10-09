// Enhanced title generation system with improved error handling and debugging
import { Request, Response } from "express";
import GeminiAIService from "../../services/GeminiAI";
import supabase from "../../lib/supabase";
import { isValidUUID } from "../isValidUUID";
import geminiService from "../../services/GeminiInitiation";
import { GenerateConversationSummaryRequest } from "../../interfaces/typescriptInterfaces";
import { SUMMARY_SYSTEM_PROMPT } from "../../utils/AIPrompts";

interface ConversationInfo {
    message_count: number;
    last_message_at: string;
    [key: string]: any;
}

interface AiConversationSummary {
    id?: number;
    conversation_id: string;
    user_id: number;
    title: string;
    summary: string;
    summary_type: string;
    updated_at: string;
    [key: string]: any;
}

/**
 * Generate a meaningful conversation title using advanced AI prompting
 * Similar to how ChatGPT and Claude AI generate titles
 */
const generateMeaningfulTitle = async (
  conversationText: string,
  summary: string
): Promise<string> => {
  try {
    const cleanedConversation = conversationText
      .replace(/(USER|HUMAN|ASSISTANT):/gi, '')
      .replace(/\n+/g, ' ')
      .trim();

    const titlePrompt = `
You are an expert at creating short, specific, human-friendly titles for conversations.

Your goal is to summarize the **core topic or task** being discussed in the fewest words possible — ideally 3 to 7 words.

Conversation excerpt:
"""${cleanedConversation.slice(0, 2000)}"""

Conversation summary:
"""${summary.slice(0, 600)}"""

Rules:
- Avoid generic phrases like "conversation", "discussion", "help", "question", or "summary"
- Don't include quotes or prefixes like "Title:"
- Use specific keywords from the topic (e.g. technologies, frameworks, user goal)
- Be concise, natural, and informative
- Present tense preferred
- 3 to 7 words max

Examples:
- "Fixing Expo Audio Playback"
- "Implementing Supabase Auth in React"
- "Uploading Audio with Progress UI"
- "Designing Onboarding for AI Assistant"
- "Building ChatGPT-Style UI with Code Blocks"
- "Debugging Supabase Function Calls"

Only respond with the title.`;

    const rawTitle = await geminiService.sendMessage(titlePrompt, [], {
      temperature: 0.25,
      maxTokens: 40,
    });

    let title = rawTitle
      ?.trim()
      .replace(/^["']|["']$/g, '')
      .replace(/^Title:\s*/i, '')
      .replace(/^[-•\d.]+\s*/, '')
      .replace(/\.$/, '');

    // Validation
    const tooShort = !title || title.length < 5;
    const tooGeneric = isGenericTitle(title || '');
    const tooLong = (title || '').split(/\s+/).length > 8;

    if (tooShort || tooGeneric || tooLong) {
      console.warn(`❌ Title rejected: "${title}"`);
      return await generateFocusedTitle(conversationText, summary);
    }

    console.log(`✅ Final Title: "${title}"`);
    return title;

  } catch (error) {
    console.error('❌ Error in generateMeaningfulTitle:', error);
    return await generateFocusedTitle(conversationText, summary);
  }
};


/**
 * Generate a more focused title using key conversation elements
 */
const generateFocusedTitle = async (conversationText: string, summary: string): Promise<string> => {
    try {
        console.log('🎯 Starting focused title generation...');
        
        const focusedPrompt = `Create a specific, engaging title for this conversation. Focus on the main action, topic, or problem being addressed.

CONVERSATION EXCERPT:
${conversationText.substring(0, 1500)}

SUMMARY:
${summary.substring(0, 400)}

Instructions:
- Identify the primary subject or task
- Use action words when appropriate (building, creating, fixing, learning, etc.)
- Be specific about technologies, topics, or domains mentioned
- Keep it natural and conversational
- 3-7 words maximum
- Don't use generic helper words

Examples of the style I want:
- "Implementing user authentication"
- "Fixing responsive design issues"
- "Creating data visualization dashboard"
- "Optimizing React component performance"
- "Building automated testing suite"
- "Designing database schema"
- "Configuring CI/CD pipeline"
- "Analyzing user behavior patterns"

RESPOND WITH ONLY THE TITLE, NO ADDITIONAL TEXT.`;

        console.log('🤖 Sending focused title request to Gemini...');
        const focusedTitle = await geminiService.sendMessage(focusedPrompt, [], {
            temperature: 0.3,
            maxTokens: 40
        });

        console.log(`🎯 Raw focused response: "${focusedTitle}"`);

        let title = focusedTitle
            ?.trim()
            ?.replace(/^["']|["']$/g, '')
            ?.replace(/^Title:\s*/i, '')
            ?.replace(/^\d+\.\s*/, '')
            ?.replace(/^-\s*/, '')
            ?.replace(/\.$/, '')
            ?.replace(/^Here's a title:\s*/i, '')
            ?.replace(/^A good title would be:\s*/i, '')
            ?.replace(/^The title is:\s*/i, '')
            ?.trim();

        console.log(`🧹 Cleaned focused title: "${title}"`);

        if (title && title.length > 0 && title.length <= 50 && !isGenericTitle(title)) {
            console.log(`✅ Focused title passed validation: "${title}"`);
            return title;
        }

        console.log('❌ Focused title failed, trying simple approach...');
        // Final fallback - extract key terms and create a simple title
        return await generateSimpleTitle(conversationText, summary);

    } catch (error) {
        console.error('❌ Error in generateFocusedTitle:', error);
        return await generateSimpleTitle(conversationText, summary);
    }
};

/**
 * Generate a simple but meaningful title from key conversation elements
 */
const generateSimpleTitle = async (conversationText: string, summary: string): Promise<string> => {
    try {
        console.log('🎯 Starting simple title generation...');
        
        const simplePrompt = `Extract the main topic from this conversation and create a simple, clear title.

CONTENT:
${conversationText.substring(0, 1000)}
${summary.substring(0, 300)}

Rules:
- Use the most important nouns and verbs from the conversation
- 2-5 words only
- Focus on the main subject matter
- Be specific, not generic
- Use simple, clear language

RESPOND WITH ONLY THE TITLE, NO ADDITIONAL TEXT.`;

        console.log('🤖 Sending simple title request to Gemini...');
        const simpleTitle = await geminiService.sendMessage(simplePrompt, [], {
            temperature: 0.2,
            maxTokens: 30
        });

        console.log(`🎯 Raw simple response: "${simpleTitle}"`);

        let title = simpleTitle
            ?.trim()
            ?.replace(/^["']|["']$/g, '')
            ?.replace(/^Title:\s*/i, '')
            ?.replace(/^\d+\.\s*/, '')
            ?.replace(/^-\s*/, '')
            ?.replace(/\.$/, '')
            ?.replace(/^Here's a title:\s*/i, '')
            ?.replace(/^A good title would be:\s*/i, '')
            ?.replace(/^The title is:\s*/i, '')
            ?.trim();

        console.log(`🧹 Cleaned simple title: "${title}"`);

        if (title && title.length > 0 && title.length <= 40 && !isGenericTitle(title)) {
            console.log(`✅ Simple title passed validation: "${title}"`);
            return title;
        }

        console.log('❌ Simple title failed, trying keyword extraction...');
        // Try keyword extraction as final attempt
        return await generateKeywordTitle(conversationText, summary);

    } catch (error) {
        console.error('❌ Error in generateSimpleTitle:', error);
        return await generateKeywordTitle(conversationText, summary);
    }
};

/**
 * Generate title from keyword extraction - final fallback before generic title
 */
const generateKeywordTitle = async (conversationText: string, summary: string): Promise<string> => {
    try {
        console.log('🎯 Starting keyword-based title generation...');
        
        // Extract keywords from conversation and summary
        const keywords = extractKeywords(conversationText, summary);
        console.log(`🔑 Extracted keywords: ${keywords.join(', ')}`);
        
        if (keywords.length > 0) {
            // Create a simple title from top keywords
            const keywordTitle = keywords.slice(0, 3).join(' ');
            if (keywordTitle.length > 0 && !isGenericTitle(keywordTitle)) {
                console.log(`✅ Keyword-based title: "${keywordTitle}"`);
                return keywordTitle;
            }
        }

        console.log('❌ Keyword extraction failed, using ultimate fallback...');
        // Ultimate fallback - try to extract topic from first few messages
        return generateTopicTitle(conversationText);

    } catch (error) {
        console.error('❌ Error in generateKeywordTitle:', error);
        return generateTopicTitle(conversationText);
    }
};

/**
 * Extract topic from conversation structure - ultimate fallback
 */
const generateTopicTitle = (conversationText: string): string => {
    try {
        console.log('🎯 Generating topic-based title...');
        
        // Look for common patterns in conversation
        const lines = conversationText.split('\n').filter(line => line.trim());
        const userMessages = lines.filter(line => line.startsWith('USER:') || line.startsWith('HUMAN:'));
        
        if (userMessages.length > 0) {
            const firstMessage = userMessages[0].replace(/^(USER|HUMAN):\s*/i, '').trim();
            const words = firstMessage.split(/\s+/).filter(word => 
                word.length > 2 && 
                !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'how', 'what', 'when', 'where', 'why', 'with', 'this', 'that', 'have', 'from', 'they', 'will', 'been', 'each', 'which', 'their', 'would', 'there', 'could', 'other'].includes(word.toLowerCase())
            );
            
            if (words.length >= 2) {
                const topicTitle = words.slice(0, 4).join(' ');
                console.log(`✅ Topic-based title: "${topicTitle}"`);
                return topicTitle;
            }
        }

        console.log('❌ All title generation methods failed, using generic fallback');
        return "Conversation summary";
        
    } catch (error) {
        console.error('❌ Error in generateTopicTitle:', error);
        return "Conversation summary";
    }
};

/**
 * Extract keywords from text
 */
const extractKeywords = (conversationText: string, summary: string): string[] => {
    const text = (conversationText + ' ' + summary).toLowerCase();
    const words = text.match(/\b[a-z]{3,}\b/g) || [];
    
    // Common stop words to exclude
    const stopWords = new Set([
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'how', 'what', 'when', 'where', 'why', 'with', 'this', 'that', 'have', 'from', 'they', 'will', 'been', 'each', 'which', 'their', 'would', 'there', 'could', 'other', 'user', 'assistant', 'help', 'need', 'want', 'like', 'know', 'think', 'see', 'get', 'make', 'take', 'come', 'give', 'look', 'use', 'find', 'tell', 'ask', 'work', 'seem', 'feel', 'try', 'leave', 'call'
    ]);
    
    // Count word frequency
    const wordCount = new Map<string, number>();
    words.forEach(word => {
        if (!stopWords.has(word) && word.length > 2) {
            wordCount.set(word, (wordCount.get(word) || 0) + 1);
        }
    });
    
    // Return top keywords
    return Array.from(wordCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);
};

/**
 * Check if a title is too generic - improved version
 */
const isGenericTitle = (title: string): boolean => {
    const genericPatterns = [
        /^(general|basic|simple|quick|help|assistance|support|question|discussion|conversation|chat|talk|session|meeting|summary)$/i,
        /^(help with|assistance with|question about|discussion about|conversation about|summary of)/i,
        /^(general discussion|basic help|simple question|quick chat|conversation summary)/i,
        /^(getting help|asking for help|need help|seeking assistance|providing help)/i,
        /^(ai|assistant|chatbot|bot|service|system|tool|app|application)$/i,
        /^(text|content|information|data|details|stuff|things|items)/i
    ];

    const titleLower = title.toLowerCase();
    return genericPatterns.some(pattern => pattern.test(titleLower)) || 
           titleLower.includes('conversation') || 
           titleLower.includes('discussion') ||
           titleLower.includes('summary') ||
           titleLower.includes('chat') ||
           titleLower.includes('help');
};

/**
 * Enhanced conversation summary generation with AI-powered titles
 */
export const generateConversationSummary = async (
    conversationId: string,
    userId: number | string,
    customPrompt: string | undefined,
    req?: GenerateConversationSummaryRequest,
    res?: Response
): Promise<{ success: boolean; title?: string; summary?: string } | void> => {
    try {
        console.log(`🚀 Starting summary generation for conversation: ${conversationId}, user: ${userId}`);

        if (!conversationId || !userId) {
            const errorMsg = 'conversationId and userId are required';
            console.error(errorMsg);
            if (res) res.status(400).json({ success: false, error: errorMsg });
            return { success: false };
        }

        if (!isValidUUID(conversationId)) {
            const errorMsg = 'Invalid conversationId format. Must be a valid UUID.';
            console.error(errorMsg);
            if (res) res.status(400).json({ success: false, error: errorMsg });
            return { success: false };
        }

        if (!process.env.GEMINI_API_KEY) {
            const errorMsg = 'Gemini API key is not configured';
            console.error(errorMsg);
            if (res) res.status(500).json({ success: false, error: errorMsg });
            return { success: false };
        }

        console.log(`📥 Fetching messages for conversation ${conversationId}...`);

        // Fetch messages with proper field names (sender instead of role)
        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .eq('user_id', parseInt(userId as string))
            .order('created_at', { ascending: true });

        if (messagesError) {
            console.error('❌ Database error fetching messages:', messagesError);
            throw messagesError;
        }

        console.log(`📊 Found ${messages?.length || 0} messages in conversation`);

        if (!messages || messages.length === 0) {
            const errorMsg = 'No messages found in conversation';
            console.error('❌', errorMsg);
            if (res) res.status(404).json({ success: false, error: errorMsg });
            return { success: false };
        }

        // Build conversation text with proper field handling
        const conversationText = messages
            .map(msg => {
                // Use 'sender' field from your database schema
                const role = (msg.sender || 'unknown').toUpperCase();
                const content = (msg.content || '').trim();
                if (!content) return null;
                return `${role}: ${content}`;
            })
            .filter(line => line !== null && line.length > 0)
            .join('\n\n');

        console.log(`📝 Conversation text length: ${conversationText.length} characters`);
        console.log(`📝 First 300 chars of conversation: ${conversationText.substring(0, 300)}...`);

        if (!conversationText || conversationText.trim().length === 0) {
            throw new Error('No valid conversation content found');
        }

        // Enhanced summary prompt
        const summaryPrompt = customPrompt || SUMMARY_SYSTEM_PROMPT || `Analyze the following conversation and provide a comprehensive summary. Focus on:
- Main topics discussed
- Key points and insights
- Important decisions or conclusions
- Overall context and purpose
- Specific technologies, tools, or methods mentioned
- Any problems solved or questions answered

Conversation:
${conversationText}

Provide a detailed, well-structured summary:`;

        console.log('🤖 Generating summary with Gemini...');
        const summary = await geminiService.sendMessage(summaryPrompt, [], {
            temperature: 0.3,
            maxTokens: 1024
        });

        console.log(`📋 Generated summary length: ${summary?.length || 0} characters`);
        console.log(`📋 Summary preview: ${summary?.substring(0, 200)}...`);

        if (!summary || summary.trim().length === 0) {
            throw new Error('AI service returned empty summary');
        }

        // Generate meaningful title using the enhanced AI system
        console.log('🏷️ Generating AI-powered title...');
        const title = await generateMeaningfulTitle(conversationText, summary);
        console.log(`🏷️ Final AI-generated title: "${title}"`);

        // Store the summary in database
        console.log('💾 Storing summary in database...');
        const { error: upsertError } = await supabase
            .from('ai_conversation_summaries')
            .upsert({
                conversation_id: conversationId,
                user_id: parseInt(userId as string),
                title,
                summary,
                summary_type: 'auto',
                updated_at: new Date().toISOString()
            });

        if (upsertError) {
            console.error('❌ Database error storing summary:', upsertError);
            throw new Error(`Failed to store summary: ${upsertError.message}`);
        }

        console.log('✅ Summary generated and stored successfully!');

        const result = {
            success: true,
            conversationId,
            title,
            summary,
            messageCount: messages.length,
            timestamp: new Date().toISOString()
        };

        if (res) {
            res.json(result);
        }

        return { success: true, title, summary };

    } catch (error: any) {
        console.error('❌ Summary generation error:', error);
        console.error('🔍 Error details:', {
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : 'Stack trace hidden in production',
            conversationId,
            userId,
            timestamp: new Date().toISOString()
        });

        const errorResponse = {
            success: false,
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        };

        if (res) {
            res.status(500).json(errorResponse);
        }
        return { success: false };
    }
};

/**
 * Check if summary should be updated based on conversation activity
 */
export const shouldUpdateSummary = async (
    conversationId: string,
    userId: number,
    messageCount: number
): Promise<boolean> => {
    try {
        console.log(`Checking if summary should be updated for conversation ${conversationId}, messageCount: ${messageCount}`);

        // Get existing summary info
        const { data: existingSummary } = await supabase
            .from('ai_conversation_summaries')
            .select('id, updated_at, message_count')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .maybeSingle();

        // Update summary if:
        // 1. No existing summary and conversation has 8+ messages
        // 2. Existing summary but conversation has grown significantly (every 10 messages after initial summary)
        if (!existingSummary) {
            console.log(`No existing summary found. Should update: ${messageCount >= 8}`);
            return messageCount >= 8;
        } else {
            const shouldUpdate = messageCount % 10 === 0 && messageCount >= 5;
            console.log(`Existing summary found with ${existingSummary.message_count} messages. Current: ${messageCount}. Should update: ${shouldUpdate}`);
            return shouldUpdate;
        }
    } catch (error) {
        console.log('Error checking summary update status:', error);
        return false;
    }
};