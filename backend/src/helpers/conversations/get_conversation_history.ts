import { GeminiMessage } from "../../interfaces/typescriptInterfaces";
import supabase from "../../lib/supabase";

export const getConversationHistory = async (
    userId: number,
    limit: number = 50,
    offset: number = 0
): Promise<GeminiMessage[]> => {
    try {

        if (!userId) {
            throw new Error('User ID is required');
        }

        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching conversation history:', error);
            return [];
        }

        return data?.map(msg => ({
            role: (msg.sender === "user" || msg.sender === "assistant" || msg.sender === "system"
                ? msg.sender
                : "user") as "user" | "assistant" | "system",
            content: msg.content
        })) || [];
    } catch (error) {
        console.error('Database error:', error);
        return [];
    }
};