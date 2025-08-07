type GeneratedImage = {
  id: string;
  uri: string;
  prompt?: string;
  alt?: string;
  width?: number;
  height?: number;
};

type AIResponseProps = {
  message: string;
  isTyping: boolean,
  loading?: boolean;
  isAborted?: boolean;
  onRegenerate?: () => void;
  onFeedback?: (type: 'like' | 'dislike', messageId?: string) => void;
  messageId?: string;
  timestamp?: Date;
  tokensUsed?: number;
  responseTime?: number;
  generatedImages?: GeneratedImage[];
  onImageSave?: (imageUri: string) => void;
};

export {
    AIResponseProps,
    GeneratedImage
}