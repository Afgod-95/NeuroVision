import axios from "axios";

export class ConversationService {

    /**
     * Get all conversation summaries for sidebar
     */
    static async getUserConversations(userId: string, page: number = 1, limit: number = 20) {
        try {
            const response = await axios.get(
                `/conversations/summaries?userId=${userId}&page=${page}&limit=${limit}`
            );
            
            if (!response.data) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.data.json();
        } catch (error) {
            console.error('Error fetching user conversations:', error);
            throw error;
        }
    }

    /**
     * Get messages for a specific conversation
     */
    static async getConversationMessages(conversationId: string, userId: string) {
        try {
            const response = await axios.get(
                `/conversations/messages?conversationId=${conversationId}&userId=${userId}`
            );
            
            if (!response.data) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.data.json();
        } catch (error) {
            console.error('Error fetching conversation messages:', error);
            throw error;
        }
    }

    /**
     * Generate summary for a conversation
     */
    static async generateSummary(conversationId: string, userId: string, customPrompt?: string) {
        try {
            const response = await axios.post(`/conversations/generate-summary`, {
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversationId,
                    userId,
                    customPrompt
                })
            });
            
            if (!response.data) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.data.json();
        } catch (error) {
            console.error('Error generating summary:', error);
            throw error;
        }
    }

    /**
     * Get specific conversation summary
     */
    static async getConversationSummary(conversationId: string, userId: string) {
        try {
            const response = await axios.get(
                `/conversations/summary?conversationId=${conversationId}&userId=${userId}`
            );
            
            if (!response.data) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.data.json();
        } catch (error) {
            console.error('Error fetching conversation summary:', error);
            throw error;
        }
    }
}
