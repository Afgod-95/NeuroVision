import axios from "axios";

export class ConversationService {
  static baseUrl = '/api';

  static async getUserConversations(userId: string, page = 1, limit = 20) {
    try {
      const response = await axios.get(`${this.baseUrl}/conversations/summaries`, {
        params: { userId, page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user conversations:', error);
      throw error;
    }
  }

  static async getConversationMessages(conversationId: string, userId: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/conversations/messages`, {
        params: { conversationId, userId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      throw error;
    }
  }


  static async getConversationSummary( userId: number) {
    try {
      const response = await axios.get(`${this.baseUrl}/conversations/user/summaries`, {
        params: { userId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching conversation summary:', error);
      throw error;
    }
  }
}
