// Enhanced title generation system inspired by Claude AI and ChatGPT
import { Request, Response } from "express";
import GeminiAIService from "../../services/GeminiAI";
import supabase from "../../lib/supabase";
import { isValidUUID } from "../../middlewares/isValidUUID";
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
        // Advanced title generation prompt that mimics ChatGPT/Claude approach
        const titlePrompt = `You are an expert at creating concise, meaningful conversation titles. Analyze the following conversation and generate a title that captures its essence.

CONVERSATION CONTENT:
${conversationText.substring(0, 2000)}

SUMMARY:
${summary.substring(0, 500)}

TITLE GENERATION RULES:
1. Create a title that immediately tells someone what the conversation was about
2. Use natural language that sounds conversational and human
3. Be specific about the main topic, task, or question discussed
4. Keep it between 3-8 words
5. Avoid generic words like "discussion", "conversation", "chat", "help", "assistance"
6. Focus on the core subject matter, not the interaction type
7. Use present tense when possible
8. Make it sound like something a human would naturally say to describe the conversation

EXAMPLES OF GOOD TITLES:
- "Setting up React authentication"
- "Python async/await best practices"
- "Designing a mobile checkout flow"
- "Debugging CSS grid layouts"
- "Planning a marketing campaign"
- "Optimizing database queries"
- "Creating a REST API"
- "Building a recommendation system"
- "Troubleshooting Docker containers"
- "Learning TypeScript generics"

EXAMPLES OF BAD TITLES:
- "Technical discussion" (too vague)
- "Getting help with coding" (focuses on interaction, not content)
- "Q&A session" (generic)
- "Problem solving" (not specific)
- "General assistance" (meaningless)

Generate ONE perfect title that captures what this conversation was really about:`;

        const generatedTitle = await geminiService.sendMessage(titlePrompt, [], {
            temperature: 0.4,
            maxTokens: 60
        });

        // Clean the generated title
        let title = generatedTitle
            ?.trim()
            ?.replace(/^["']|["']$/g, '') // Remove quotes
            ?.replace(/^Title:\s*/i, '') // Remove "Title:" prefix
            ?.replace(/^Generate.*?:\s*/i, '') // Remove prompt echoes
            ?.replace(/^\d+\.\s*/, '') // Remove numbered list
            ?.replace(/^-\s*/, '') // Remove dash prefix
            ?.replace(/\.$/, '') // Remove trailing period
            ?.replace(/^Here's a title:\s*/i, '') // Remove common AI prefixes
            ?.replace(/^A good title would be:\s*/i, '')
            ?.replace(/^The title is:\s*/i, '')
            ?.trim();

        // Validate title quality
        if (title && title.length > 0 && title.length <= 60) {
            // Additional quality checks
            const wordCount = title.split(/\s+/).length;
            const hasContent = title.length > 10; // Minimum meaningful length
            const notTooGeneric = !isGenericTitle(title);
            
            if (wordCount >= 3 && wordCount <= 8 && hasContent && notTooGeneric) {
                return title;
            }
        }

        // If first attempt failed, try with more specific context
        return await generateFocusedTitle(conversationText, summary);

    } catch (error) {
        console.error('Error generating meaningful title:', error);
        return await generateFocusedTitle(conversationText, summary);
    }
};

/**
 * Generate a more focused title using key conversation elements
 */
const generateFocusedTitle = async (conversationText: string, summary: string): Promise<string> => {
    try {
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

Generate one focused title:`;

        const focusedTitle = await geminiService.sendMessage(focusedPrompt, [], {
            temperature: 0.3,
            maxTokens: 40
        });

        let title = focusedTitle
            ?.trim()
            ?.replace(/^["']|["']$/g, '')
            ?.replace(/^Title:\s*/i, '')
            ?.replace(/^\d+\.\s*/, '')
            ?.replace(/^-\s*/, '')
            ?.replace(/\.$/, '')
            ?.trim();

        if (title && title.length > 0 && title.length <= 50 && !isGenericTitle(title)) {
            return title;
        }

        // Final fallback - extract key terms and create a simple title
        return await generateSimpleTitle(conversationText, summary);

    } catch (error) {
        console.error('Error generating focused title:', error);
        return await generateSimpleTitle(conversationText, summary);
    }
};

/**
 * Generate a simple but meaningful title from key conversation elements
 */
const generateSimpleTitle = async (conversationText: string, summary: string): Promise<string> => {
    try {
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

Generate a simple title:`;

        const simpleTitle = await geminiService.sendMessage(simplePrompt, [], {
            temperature: 0.2,
            maxTokens: 30
        });

        let title = simpleTitle
            ?.trim()
            ?.replace(/^["']|["']$/g, '')
            ?.replace(/^Title:\s*/i, '')
            ?.replace(/^\d+\.\s*/, '')
            ?.replace(/^-\s*/, '')
            ?.replace(/\.$/, '')
            ?.trim();

        if (title && title.length > 0 && title.length <= 40 && !isGenericTitle(title)) {
            return title;
        }

        // Ultimate fallback
        return "Conversation summary";

    } catch (error) {
        console.error('Error generating simple title:', error);
        return "Conversation summary";
    }
};

/**
 * Check if a title is too generic
 */
const isGenericTitle = (title: string): boolean => {
    const genericPatterns = [
        /^(general|basic|simple|quick|help|assistance|support|question|discussion|conversation|chat|talk|session|meeting)$/i,
        /^(help with|assistance with|question about|discussion about|conversation about)/i,
        /^(general discussion|basic help|simple question|quick chat)/i,
        /^(getting help|asking for help|need help|seeking assistance)/i
    ];

    return genericPatterns.some(pattern => pattern.test(title.toLowerCase()));
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
            const shouldUpdate = messageCount % 10 === 0 && messageCount >= 15;
            console.log(`Existing summary found with ${existingSummary.message_count} messages. Current: ${messageCount}. Should update: ${shouldUpdate}`);
            return shouldUpdate;
        }
    } catch (error) {
        console.log('Error checking summary update status:', error);
        return false;
    }
};