// Enhanced title generation system inspired by Claude AI
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
 * Inspired by Claude AI's title generation approach
 */
const generateMeaningfulTitle = async (
    conversationText: string,
    summary: string
): Promise<string> => {
    try {
        // Extract key themes and topics from the conversation
        const themeAnalysisPrompt = `Analyze this conversation and identify the main themes, topics, and purpose. Focus on:

1. Primary subject matter
2. Key concepts discussed
3. Type of interaction (question/answer, brainstorming, problem-solving, etc.)
4. Specific domains (technical, creative, business, personal, etc.)
5. Notable entities, tools, or technologies mentioned

Conversation snippet:
${conversationText.substring(0, 1000)}

Summary:
${summary.substring(0, 300)}

Provide a brief analysis of the main themes and topics:`;

        const themeAnalysis = await geminiService.sendMessage(themeAnalysisPrompt, [], {
            temperature: 0.2,
            maxTokens: 200
        });

        // Generate title based on theme analysis
        const titlePrompt = `Based on the following theme analysis, create a descriptive and engaging conversation title that follows these principles:

TITLE GUIDELINES:
- Be specific and descriptive (not generic)
- Capture the essence of what was discussed
- Use natural, conversational language
- Avoid generic words like "discussion", "conversation", "chat"
- Maximum 8 words, minimum 3 words
- Make it sound like something a human would naturally say

EXAMPLES OF GOOD TITLES:
- "Building a React authentication system"
- "Debugging Python import errors"
- "Planning a weekend camping trip"
- "Optimizing database query performance"
- "Learning TypeScript generics"
- "Designing a mobile app interface"
- "Troubleshooting network connectivity issues"
- "Creating a marketing campaign strategy"

EXAMPLES OF BAD TITLES:
- "General Discussion" (too vague)
- "Q&A Session" (too generic)
- "Problem Solving" (not specific)
- "Technical Discussion" (lacks detail)

Theme Analysis:
${themeAnalysis}

Generate one perfect title:`;

        const generatedTitle = await geminiService.sendMessage(titlePrompt, [], {
            temperature: 0.3,
            maxTokens: 50
        });

        // Clean and validate the generated title
        let title = generatedTitle
            ?.trim()
            ?.replace(/^["']|["']$/g, '') // Remove quotes
            ?.replace(/^Title:\s*/i, '') // Remove "Title:" prefix
            ?.replace(/^Generate.*?:\s*/i, '') // Remove prompt echoes
            ?.replace(/^\d+\.\s*/, '') // Remove numbered list
            ?.replace(/^-\s*/, '') // Remove dash prefix
            ?.replace(/\.$/, '') // Remove trailing period
            ?.trim();

        // Validate title quality
        if (title && title.length > 0 && title.length <= 50) {
            // Check if title is meaningful (not just generic words)
            const genericWords = ['discussion', 'conversation', 'chat', 'talk', 'session', 'meeting'];
            const isGeneric = genericWords.some(word => 
                title.toLowerCase().includes(word) && title.split(' ').length <= 3
            );
            
            if (!isGeneric) {
                return title;
            }
        }

        // Fallback to smart title generation based on content analysis
        return generateSmartFallbackTitle(conversationText, summary);

    } catch (error) {
        console.error('Error generating meaningful title:', error);
        return generateSmartFallbackTitle(conversationText, summary);
    }
};

/**
 * Generate smart fallback titles based on content analysis
 */
const generateSmartFallbackTitle = (conversationText: string, summary: string): string => {
    const content = (conversationText + ' ' + summary).toLowerCase();
    
    // Technology and Programming
    if (content.includes('react') || content.includes('jsx')) return 'React development help';
    if (content.includes('python') && content.includes('error')) return 'Python error troubleshooting';
    if (content.includes('javascript') || content.includes('js')) return 'JavaScript coding assistance';
    if (content.includes('typescript') || content.includes('ts')) return 'TypeScript development help';
    if (content.includes('database') || content.includes('sql')) return 'Database query optimization';
    if (content.includes('api') && content.includes('integration')) return 'API integration guidance';
    if (content.includes('docker') || content.includes('container')) return 'Docker containerization help';
    if (content.includes('git') && content.includes('merge')) return 'Git merge conflict resolution';
    if (content.includes('aws') || content.includes('cloud')) return 'Cloud infrastructure setup';
    if (content.includes('machine learning') || content.includes('ml')) return 'Machine learning implementation';
    
    // Business and Strategy
    if (content.includes('marketing') && content.includes('campaign')) return 'Marketing campaign planning';
    if (content.includes('business') && content.includes('plan')) return 'Business strategy development';
    if (content.includes('budget') || content.includes('financial')) return 'Financial planning discussion';
    if (content.includes('team') && content.includes('management')) return 'Team management strategies';
    if (content.includes('project') && content.includes('timeline')) return 'Project timeline planning';
    
    // Creative and Design
    if (content.includes('design') && content.includes('ui')) return 'UI design feedback';
    if (content.includes('logo') || content.includes('branding')) return 'Brand identity creation';
    if (content.includes('website') && content.includes('layout')) return 'Website layout design';
    if (content.includes('color') && content.includes('palette')) return 'Color scheme selection';
    
    // Writing and Content
    if (content.includes('essay') || content.includes('writing')) return 'Writing assistance and feedback';
    if (content.includes('blog') && content.includes('post')) return 'Blog content creation';
    if (content.includes('email') && content.includes('template')) return 'Email template design';
    if (content.includes('resume') || content.includes('cv')) return 'Resume optimization help';
    
    // Learning and Education
    if (content.includes('learn') && content.includes('tutorial')) return 'Learning resource recommendations';
    if (content.includes('study') && content.includes('plan')) return 'Study plan development';
    if (content.includes('course') || content.includes('curriculum')) return 'Course curriculum advice';
    
    // Personal and Lifestyle
    if (content.includes('travel') && content.includes('itinerary')) return 'Travel itinerary planning';
    if (content.includes('recipe') || content.includes('cooking')) return 'Cooking recipe suggestions';
    if (content.includes('fitness') || content.includes('workout')) return 'Fitness routine planning';
    if (content.includes('book') && content.includes('recommendation')) return 'Book recommendations';
    
    // Problem Solving
    if (content.includes('debug') || content.includes('troubleshoot')) return 'Technical troubleshooting';
    if (content.includes('optimize') || content.includes('improve')) return 'Performance optimization';
    if (content.includes('fix') && content.includes('issue')) return 'Issue resolution help';
    
    // Generic but meaningful fallbacks
    if (content.includes('how to')) return 'Step-by-step guidance';
    if (content.includes('best practices')) return 'Best practices advice';
    if (content.includes('comparison') || content.includes('vs')) return 'Comparison and analysis';
    if (content.includes('recommendation')) return 'Personalized recommendations';
    
    // Final fallback - try to extract a meaningful phrase
    const words = content.split(' ').filter(word => word.length > 3);
    const meaningfulWords = words.filter(word => 
        !['this', 'that', 'with', 'from', 'they', 'have', 'will', 'been', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could', 'other'].includes(word)
    );
    
    if (meaningfulWords.length >= 2) {
        return `${meaningfulWords[0]} ${meaningfulWords[1]} help`.replace(/ing\s+/g, ' ');
    }
    
    return 'Helpful conversation';
};

/**
 * Enhanced conversation summary generation with meaningful titles
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
        const summaryPrompt = SUMMARY_SYSTEM_PROMPT || `Analyze the following conversation and provide a comprehensive summary. Focus on:
- Main topics discussed
- Key points and insights
- Important decisions or conclusions
- Overall context and purpose

Conversation:
${conversationText}

Provide a detailed summary:`;

        console.log('🤖 Generating summary with Gemini...');
        const summary = await geminiService.sendMessage(summaryPrompt, [], {
            temperature: 0.3,
            maxTokens: 1024
        });

        console.log(`📋 Generated summary length: ${summary?.length || 0} characters`);

        if (!summary || summary.trim().length === 0) {
            throw new Error('AI service returned empty summary');
        }

        // Generate meaningful title using the enhanced system
        console.log('🏷️ Generating meaningful title...');
        const title = await generateMeaningfulTitle(conversationText, summary);
        console.log(`🏷️ Final meaningful title: "${title}"`);

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