/**
 * Conversations and Messages interface
 */
interface ConversationSummary {
    conversation_id: string;
    user_id: number;
    title: string;
    summary: string;
    summary_type: string;
    message_count: number;
    created_at: string;
    updated_at: string;
}

// ✅ UPDATED: FileAttachment now stores full file data for regeneration
interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  uri?: string;        // For React Native files
  base64?: string;     // ✅ NEW: Store base64 for regeneration
  thumbnail?: string;
}

interface MessageContent {
  type: 'text' | 'audio' | 'image' | 'files' | 'mixed';  // ✅ Added 'files' type
  text?: string;
  audioUrl?: string;
  audioName?: string;
  audioDuration?: number;
  imageUrl?: string;
  imageName?: string;
  imageWidth?: number;
  imageHeight?: number;
  files?: FileAttachment[];  // ✅ Now includes full file data
}

interface UploadedAudioFile {
    name?: string;
    duration?: number;
    uploadResult?: {
        signedUrl: string;
    };
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uri?: string;
  base64?: string;
}

interface RootState {
    user: {
        user: {
            id: string;
            username?: string;
        };
    };
    messageOptions: {
        messageId: string;
        isEdited: boolean;
    };
}

// Component Props
interface RealtimeChatProps {
    uniqueConvId?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    onMessagesChange?: (messages: Message[]) => void;
    onLoadingChange?: (loading: boolean) => void;
    initialMessages?: Message[];
    enableSampleMessages?: boolean;
}

interface Message {
  id: string;
  conversation_id?: string;
  user_id?: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  created_at: string;
  timestamp: string;
  user: boolean;
  isLoading?: boolean;
  isTyping?: boolean;
  content?: MessageContent;
}

// API Message interface to match backend response
interface ApiMessage {
  id: string;
  conversation_id: string;
  user_id: number;
  sender: 'user' | 'assistant' | 'ai';
  content: string;
  created_at: string;
  updated_at: string;
}

// API Response interface
interface ApiResponse {
  success: boolean;
  conversationId: string;
  messages: ApiMessage[];
}

interface SupabaseMessage {
    id: string;
    conversation_id: string;
    user_id: string;
    sender: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
}

interface ConversationListResponse extends ApiResponse {
    conversations: ConversationSummary[];
    totalCount: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

interface ConversationMessagesResponse {
    success: boolean;
    conversationId: string;
    messages: Message[];
    messageCount: number;
}

export {
    ConversationListResponse,
    ConversationMessagesResponse,
    ConversationSummary,
    Message,
    ApiResponse,
    ApiMessage,
    SupabaseMessage,
    MessageContent,
    FileAttachment,
    UploadedAudioFile,
    UploadedFile,
    RealtimeChatProps,
    RootState
}