/**
 * Generate or validate conversation ID
 */
import { isValidUUID } from "../isValidUUID";
import { v4 as uuidv4 } from 'uuid';

export const getOrCreateConversationId = (conversationId?: string): string => {
    if (conversationId && isValidUUID(conversationId)) {
        return conversationId;
    }

    // Generate new UUID if not provided or invalid
    const newId = uuidv4();
    console.log('Generated new conversation ID:', newId);
    return newId;
};