import { useCallback } from "react";
import { MessageContent, SupabaseMessage, Message } from "@/src/utils/interfaces/TypescriptInterfaces";


// Utility functions for message processing
export const useMessageUtils = (flatListRef: React.RefObject<any>) => {
    const transformSupabaseMessage = useCallback((supabaseMessage: SupabaseMessage): Message => {
        let content: MessageContent;
        let text: string;

        try {
            const parsed = JSON.parse(supabaseMessage.content);
            content = parsed;
            text = parsed.text || supabaseMessage.content;
        } catch {
            content = { type: 'text', text: supabaseMessage.content };
            text = supabaseMessage.content;
        }

        return {
            id: supabaseMessage.id,
            conversation_id: supabaseMessage.conversation_id,
            user_id: supabaseMessage.user_id,
            sender: supabaseMessage.sender,
            text: text,
            created_at: supabaseMessage.created_at,
            timestamp: supabaseMessage.created_at,
            user: supabaseMessage.sender === 'user',
            content: content,
        };
    }, []);

    const extractAIResponseText = useCallback((aiResponse: any): string => {
        const possibleFields = [
            'response',
            'message',
            'content',
            'text',
            'answer',
            'reply'
        ];

        for (const field of possibleFields) {
            if (aiResponse[field] && typeof aiResponse[field] === 'string' && aiResponse[field].trim()) {
                return aiResponse[field].trim();
            }
        }

        if (typeof aiResponse === 'string' && aiResponse.trim()) {
            return aiResponse.trim();
        }

        console.log('AI Response structure:', JSON.stringify(aiResponse, null, 2));
        return 'I apologize, but I was unable to generate a proper response. Please try again.';
    }, []);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            flatListRef?.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [flatListRef]);

    return {
        transformSupabaseMessage,
        extractAIResponseText,
        scrollToBottom,
    };
};