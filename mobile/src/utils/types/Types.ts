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
  disableReadAloud: boolean;
  openReadAloud: () => void;
  loading?: boolean;
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