import axios from 'axios';

type UserMessageProps = {
  userId: string | number;
};

// Transform message data to match component expectations
const transformMessage = (message: any) => ({
  id: message.id,
  text: message.content,
  created_at: message.created_at,
  user_id: message.user_id
});

export const fetchUserMessages = async ({ userId }: UserMessageProps) => {
  try {
    const response = await axios.get(`/api/messages/${userId}`);
    
    // Handle both possible response formats
    const messages = response.data.content || response.data.messages || [];
    
    // Transform messages to match component expectations
    const transformedMessages = messages.map(transformMessage);
    
    return {
      content: transformedMessages,
      messages: transformedMessages
    };
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw new Error('Failed to fetch messages');
  }
};