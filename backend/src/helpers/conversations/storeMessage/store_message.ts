import supabase from "../../../lib/supabase";
import { isValidUUID } from "../../isValidUUID";

/**
 * Store message in Supabase with enhanced error handling, retry logic, and optional file support
 */
const storeMessage = async (
    conversationId: string,
    userId: number,
    sender: 'user' | 'assistant' | 'system',
    content: string,
    files?: Array<{ id: string; name: string; type: string; size: number; uri?: string }>,
    retries: number = 3
): Promise<string | null> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Validate UUID format
            if (!isValidUUID(conversationId)) {
                throw new Error(`Invalid conversation_id format: ${conversationId}. Must be a valid UUID.`);
            }

            // Validate required fields
            if (!content || content.trim() === '') {
                throw new Error('Message content cannot be empty');
            }

            if (!userId || userId <= 0) {
                throw new Error('Invalid user_id');
            }

            // Truncate content if too long 
            const truncatedContent = content.length > 50000 ? content.substring(0, 50000) + '...' : content;

            console.log(`Storing message (attempt ${attempt}):`, {
                conversation_id: conversationId,
                user_id: userId,
                sender,
                content_length: truncatedContent.length,
                has_files: !!files && files.length > 0,
                files_count: files?.length || 0
            });

            const { data, error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    user_id: userId,
                    sender,
                    content: truncatedContent.trim()
                })
                .select();

            if (error) {
                console.error('Supabase error details:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                    attempt
                });

                if (attempt === retries) {
                    throw new Error(`Database error after ${retries} attempts: ${error.message}`);
                }

                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                continue;
            }

            const messageId = data?.[0]?.id;
            console.log('Message stored successfully:', messageId || 'No ID returned');

            // Store file metadata if files are provided
            if (files && files.length > 0 && messageId) {
                await storeMessageFiles(conversationId, userId, messageId, files);
            }

            return messageId || null;
        } catch (error) {
            if (attempt === retries) {
                console.error('Error in storeMessage after all retries:', error);
                throw error;
            }

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
    
    return null;
};

/**
 * Helper function to store file metadata associated with a message
 */
async function storeMessageFiles(
    conversationId: string, 
    userId: number,
    messageId: string,
    files: Array<{ id: string; name: string; type: string; size: number; uri?: string }>
): Promise<void> {
    try {
        const fileRecords = files.map(file => ({
            conversation_id: conversationId,
            user_id: userId,
            message_id: messageId,
            file_id: file.id,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_uri: file.uri || null,
            created_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('message_files')
            .insert(fileRecords);

        if (error) {
            console.error('Error storing file metadata:', error);
            // Don't throw - files are stored as text in message content, this is just metadata
        } else {
            console.log(`✅ Stored metadata for ${files.length} files linked to message ${messageId}`);
        }
    } catch (error) {
        console.error('Failed to store file metadata:', error);
        // Don't throw - this is non-critical, files info is already in message content
    }
}



export { storeMessage, storeMessageFiles }