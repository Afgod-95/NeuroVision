import supabase from "../../lib/supabase";
import { Request, Response } from "express";
import { generateConversationSummary, shouldUpdateSummary } from "../../helpers/chatSummary/AISummary";
import geminiService from "../../services/GeminiInitiation";
import { DEFAULT_SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT } from "../../utils/AIPrompts";
import { storeMessage } from "../../helpers/storeMessage/store_message";
import { getConversationHistory } from "./conversations.controller";
import { getOrCreateConversationId } from "../../helpers/conversations/get_or_generate_conversation_id";

/**
 * Chat message handler with better error handling and response formatting
 */
export const sendChatMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extract files from multer
        const uploadedFiles = req.files as Express.Multer.File[];
        
        // Parse the message and other fields from form data
        const {
            message,
            conversationHistory: rawConversationHistory,
            systemPrompt,
            temperature,
            maxTokens,
            conversationId: rawConversationId,
            useDatabase = true,
        } = req.body;

        // Parse conversationHistory if it's a string (from form-data)
        let conversationHistory = [];
        if (rawConversationHistory) {
            try {
                conversationHistory = typeof rawConversationHistory === 'string' 
                    ? JSON.parse(rawConversationHistory) 
                    : rawConversationHistory;
            } catch (e) {
                console.error('Failed to parse conversationHistory:', e);
            }
        }

        // Process uploaded files into the format expected by the rest of the code
        const files = uploadedFiles?.map(file => ({
            id: `${Date.now()}-${file.originalname}`,
            name: file.originalname,
            type: file.mimetype,
            size: file.size,
            base64: file.buffer.toString('base64'),
            buffer: file.buffer
        })) || [];

        const authUserId = req?.user?.id;
        const userId = parseInt(authUserId as string);
        if (!authUserId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }

        console.log('Request received:', {
            message: message ? `${message.substring(0, 100)}...` : 'No message',
            conversationId: rawConversationId,
            userId,
            useDatabase,
            historyLength: conversationHistory?.length || 0,
            filesCount: files?.length || 0
        });

        // Enhanced validation
        const hasMessage = message && typeof message === 'string' && message.trim().length > 0;
        const hasFiles = files && Array.isArray(files) && files.length > 0;

        if (!hasMessage && !hasFiles) {
            res.status(400).json({
                success: false,
                error: 'Either message or files must be provided'
            });
            return;
        }

        if (message && message.length > 50000) {
            res.status(400).json({
                success: false,
                error: 'Message is too long. Maximum length is 50,000 characters.'
            });
            return;
        }

        if (hasFiles) {
            console.log('Files received:', files!.map(f => ({
                name: f.name,
                type: f.type,
                size: `${(f.size / 1024).toFixed(2)}KB`
            })));
        }

        if (useDatabase && !userId) {
            res.status(400).json({
                success: false,
                error: 'userId is required when useDatabase is true'
            });
            return;
        }

        // Generate or validate conversation ID
        const conversationId = useDatabase ? getOrCreateConversationId(rawConversationId) : rawConversationId;
        console.log('Using conversation ID:', conversationId);

        // Get conversation history from database if using database mode
        let history = conversationHistory || [];
        if (useDatabase && conversationId && userId) {
            try {
                history = await getConversationHistory(userId);
                console.log(`Retrieved ${history.length} messages from database`);
            } catch (error) {
                console.error('Error getting conversation history:', error);
                history = [];
            }
        }

        // Limit history length to prevent token overflow
        const maxHistoryLength = 20;
        if (history.length > maxHistoryLength) {
            history = history.slice(-maxHistoryLength);
        }

        // Enhanced system prompt
        const enhancedSystemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;

        // Prepare user message content with files
        let userMessageContent = message || '';
        if (hasFiles) {
            const fileDescriptions = files!.map(f =>
                `[Attached file: ${f.name} (${f.type}, ${(f.size / 1024).toFixed(2)}KB)]`
            ).join('\n');

            userMessageContent = userMessageContent
                ? `${userMessageContent}\n\n${fileDescriptions}`
                : fileDescriptions;
        }

        // Store user message if using database
        let userMessageStored = false;
        let userMessageId: string | null = null;
        if (useDatabase && conversationId && userId) {
            console.log('Storing user message...');
            try {
                userMessageId = await storeMessage(conversationId, userId, 'user', userMessageContent, files);
                userMessageStored = !!userMessageId;
                console.log('✅ User message stored successfully with ID:', userMessageId);
            } catch (error) {
                console.error('❌ Failed to store user message:', error);
            }
        }

        // Send message to Gemini
        console.log('Sending message to Gemini...');

        const response = await geminiService.sendMessage(
            message || 'Please analyze these files:',
            history,
            {
                systemPrompt: enhancedSystemPrompt,
                temperature: parseFloat(temperature) || 0.7,
                maxTokens: parseInt(maxTokens) || 4096,
                files: hasFiles ? files : undefined
            }
        );

        console.log(`Received response from Gemini (${response.length} characters)`);

        // Store assistant response if using database
        let assistantMessageStored = false;
        if (useDatabase && conversationId && userId && response) {
            console.log('Storing assistant message...');
            try {
                await storeMessage(conversationId, userId, 'assistant', response);
                assistantMessageStored = true;
                console.log('✅ Assistant message stored successfully');
            } catch (error) {
                console.error('❌ Failed to store assistant message:', error);
            }
        }

        // Prepare updated conversation history for response 
        const updatedHistory = [
            ...history,
            { role: 'user' as const, content: userMessageContent },
            { role: 'assistant' as const, content: response }
        ];

        // Handle AI conversation summary
        if (useDatabase && conversationId && userId && userMessageStored && assistantMessageStored) {
            console.log('Starting summary generation process...');

            try {
                const { count: actualMessageCount, error: countError } = await supabase
                    .from('messages')
                    .select('content', { count: 'exact', head: true })
                    .eq('conversation_id', conversationId)
                    .eq('user_id', userId);

                if (countError) {
                    console.error('Error getting message count:', countError);
                } else {
                    console.log(`Actual message count in DB: ${actualMessageCount}`);

                    const shouldGenerate = await shouldUpdateSummary(
                        conversationId,
                        parseInt(userId.toString()),
                        actualMessageCount || 0
                    );
                    console.log(`Should generate summary: ${shouldGenerate}`);

                    if (shouldGenerate) {
                        console.log('Generating conversation summary...');

                        setTimeout(async () => {
                            try {
                                console.log('🚀 Starting delayed summary generation...');

                                const result = await generateConversationSummary(
                                    conversationId,
                                    userId,
                                    SUMMARY_SYSTEM_PROMPT
                                );

                                if (result?.success) {
                                    console.log("✅ Summary generated successfully:", {
                                        title: result.title,
                                        summaryLength: result.summary?.length || 0
                                    });
                                } else {
                                    console.warn("⚠️ Summary generation completed but returned no success confirmation");
                                }
                            } catch (err: any) {
                                console.error("❌ Summary generation failed:", err.message);
                            }
                        }, 2000);
                    } else {
                        console.log('Skipping summary generation (conditions not met)');
                    }
                }
            } catch (error) {
                console.error('Error in summary generation process:', error);
            }
        }

        // Enhanced response format
        res.json({
            success: true,
            response,
            conversationHistory: updatedHistory,
            conversationId,
            metadata: {
                messageStored: useDatabase && userMessageStored && assistantMessageStored,
                historyLength: updatedHistory.length,
                responseLength: response.length,
                filesProcessed: hasFiles ? files!.length : 0,
                model: "gemini-2.5-flash",
                timestamp: new Date().toISOString(),
                summaryProcessed: useDatabase
            }
        });

    } catch (error: any) {
        console.error('Chat message error:', error);
        console.error('Error stack:', error.stack);

        let errorMessage = 'Failed to send message to Gemini AI';
        let statusCode = 500;

        if (error.message?.includes('Invalid conversation_id')) {
            errorMessage = 'Invalid conversation ID format. Must be a valid UUID.';
            statusCode = 400;
        } else if (error.message?.includes('Foreign key constraint')) {
            errorMessage = 'Invalid user ID. User does not exist.';
            statusCode = 400;
        } else if (error.message?.includes('database') || error.message?.includes('store')) {
            errorMessage = `Database error: ${error.message}`;
        } else if (error.message?.includes('Gemini') || error.message?.includes('API')) {
            errorMessage = 'Failed to get response from Gemini AI';
        } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
            errorMessage = 'API quota exceeded. Please try again later.';
            statusCode = 429;
        } else if (error.message?.includes('file')) {
            errorMessage = 'File processing error. Please check file format and size.';
            statusCode = 400;
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
    }
};