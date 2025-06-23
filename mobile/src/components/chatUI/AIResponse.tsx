import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Dimensions,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Markdown from 'react-native-markdown-display';
import { Pressable, ScrollView } from 'react-native-gesture-handler';
import { Colors } from '@/src/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

const AdvancedAIResponse = ({
  message,
  loading = true,
  onRegenerate,
  onFeedback,
  messageId,
  timestamp = new Date(),
  tokensUsed,
  responseTime,
  generatedImages = [],
  onImageSave,
}: AIResponseProps) => {
  const [isLiked, setIsLiked] = useState<'like' | 'dislike' | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  const [expandedBlocks, setExpandedBlocks] = useState<{ [key: string]: boolean }>({});
  const [mainCopied, setMainCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [imageLoadingStates, setImageLoadingStates] = useState<{ [key: string]: boolean }>({});

  // Reanimated shared values
  const fadeOpacity = useSharedValue(0);
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);
  const modalOpacity = useSharedValue(0);
  const modalScale = useSharedValue(0.8);

  // Animated styles
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
  }));

  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
  }));

  const modalContentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
  }));

  // Start typing animation
  useEffect(() => {
    if (loading) {
      // Start typing dots animation
      const startTypingAnimation = () => {
        dot1Opacity.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 400 }),
            withTiming(0.3, { duration: 400 })
          ),
          -1,
          false
        );

        dot2Opacity.value = withRepeat(
          withSequence(
            withTiming(0.3, { duration: 200 }),
            withTiming(1, { duration: 400 }),
            withTiming(0.3, { duration: 200 })
          ),
          -1,
          false
        );

        dot3Opacity.value = withRepeat(
          withSequence(
            withTiming(0.3, { duration: 400 }),
            withTiming(1, { duration: 400 }),
            withTiming(0.3, { duration: 200 })
          ),
          -1,
          false
        );
      };

      startTypingAnimation();
    } else {
      // Fade in content when loading is done
      fadeOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [loading]);

  // Modal animation effect
  useEffect(() => {
    if (selectedImage) {
      modalOpacity.value = withTiming(1, { duration: 200 });
      modalScale.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.back(1.1))
      });
    } else {
      modalOpacity.value = withTiming(0, { duration: 150 });
      modalScale.value = withTiming(0.8, { duration: 150 });
    }
  }, [selectedImage]);

  const handleLike = (type: 'like' | 'dislike') => {
    const newState = isLiked === type ? null : type;
    setIsLiked(newState);
    onFeedback?.(type, messageId);
  };

  const handleCopy = async (text: string, blockId?: string) => {
    try {
      await Clipboard.setString(text);

      if (blockId) {
        setCopiedStates(prev => ({ ...prev, [blockId]: true }));
        setTimeout(() => {
          setCopiedStates(prev => ({ ...prev, [blockId]: false }));
        }, 2000);
      } else {
        setMainCopied(true);
        setTimeout(() => {
          setMainCopied(false);
        }, 2000);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to copy content');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: message,
        title: 'AI Response',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleImagePress = (image: GeneratedImage) => {
    setSelectedImage(image);
  };

  const handleImageSave = async (imageUri: string) => {
    try {
      onImageSave?.(imageUri);
      Alert.alert('Success', 'Image saved to gallery');
    } catch (error) {
      Alert.alert('Error', 'Failed to save image');
    }
  };

  const handleImageShare = async (image: GeneratedImage) => {
    try {
      await Share.share({
        url: image.uri,
        title: image.prompt || 'Generated Image',
      });
    } catch (error) {
      console.error('Error sharing image:', error);
    }
  };

  const extractCodeBlocks = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const blocks = [];
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      blocks.push({
        id: `code-${blocks.length}`,
        language: match[1] || 'text',
        code: match[2].trim(),
        fullMatch: match[0],
      });
    }

    return blocks;
  };

  const CodeBlock = ({ code, language, blockId }: { code: string; language: string; blockId: string }) => {
    const isCopied = copiedStates[blockId];

    return (
      <View style={styles.codeBlockContainer}>
        <View style={styles.codeHeader}>
          <Text style={styles.codeLanguage}>{language}</Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => handleCopy(code, blockId)}
          >
            <Feather
              name={isCopied ? "check" : "copy"}
              size={16}
              color={isCopied ? "#10b981" : "#666"}
            />
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.codeScrollView}
        >
          <Text style={styles.codeText}>{code}</Text>
        </ScrollView>
      </View>
    );
  };

  const ImageGallery = ({ images }: { images: GeneratedImage[] }) => {
    if (images.length === 0) return null;

    return (
      <View style={styles.imageGalleryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.imageScrollContainer}
        >
          {images.map((image) => (
            <TouchableOpacity
              key={image.id}
              style={styles.imageContainer}
              onPress={() => handleImagePress(image)}
              activeOpacity={0.8}
            >
              <View style={styles.imageWrapper}>
                {imageLoadingStates[image.id] && (
                  <View style={styles.imageLoadingOverlay}>
                    <ActivityIndicator size="small" color="#666" />
                  </View>
                )}
                <Image
                  source={{ uri: image.uri }}
                  style={styles.generatedImage}
                  onLoadStart={() => setImageLoadingStates(prev => ({ ...prev, [image.id]: true }))}
                  onLoadEnd={() => setImageLoadingStates(prev => ({ ...prev, [image.id]: false }))}
                  onError={() => setImageLoadingStates(prev => ({ ...prev, [image.id]: false }))}
                />
              </View>
              {image.prompt && (
                <Text style={styles.imagePrompt} numberOfLines={2}>
                  {image.prompt}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderCustomMarkdown = (text: string) => {
    const codeBlocks = extractCodeBlocks(text);

    if (codeBlocks.length === 0) {
      return <Markdown style={markdownStyles}>{text}</Markdown>;
    }

    let processedText = text;

    codeBlocks.forEach((block, index) => {
      const placeholder = `__CODE_BLOCK_${index}__`;
      processedText = processedText.replace(block.fullMatch, placeholder);
    });

    const parts = processedText.split(/(__CODE_BLOCK_\d+__)/);

    return parts.map((part, index) => {
      const codeBlockMatch = part.match(/__CODE_BLOCK_(\d+)__/);

      if (codeBlockMatch) {
        const blockIndex = parseInt(codeBlockMatch[1]);
        const block = codeBlocks[blockIndex];
        return (
          <CodeBlock
            key={`code-${blockIndex}`}
            code={block.code}
            language={block.language}
            blockId={block.id}
          />
        );
      }

      return part ? <Markdown key={index} style={markdownStyles}>{part}</Markdown> : null;
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.messageContent}>
          <View style={styles.loadingContainer}>
            <View style={styles.typingIndicator}>
              <Animated.View style={[styles.typingDot, dot1Style]} />
              <Animated.View style={[styles.typingDot, dot2Style]} />
              <Animated.View style={[styles.typingDot, dot3Style]} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Pressable>
      <Animated.View style={[styles.container, fadeStyle]}>
        <View style={styles.messageContent}>
          {/* Generated Images */}
          <ImageGallery images={generatedImages} />

          {/* Content */}
          <View style={styles.contentContainer}>
            {renderCustomMarkdown(message)}
          </View>

          {/* Action Bar */}
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={[styles.actionButton, mainCopied && styles.actionButtonActive]}
              onPress={() => handleCopy(message)}
            >
              <Feather
                name={mainCopied ? "check" : "copy"}
                size={16}
                color={mainCopied ? "#10b981" : "#8e8ea0"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, isLiked === 'like' && styles.actionButtonActive]}
              onPress={() => handleLike('like')}
            >
              <Feather
                name="thumbs-up"
                size={16}
                color={isLiked === 'like' ? "#10b981" : "#8e8ea0"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, isLiked === 'dislike' && styles.actionButtonActive]}
              onPress={() => handleLike('dislike')}
            >
              <Feather
                name="thumbs-down"
                size={16}
                color={isLiked === 'dislike' ? "#ef4444" : "#8e8ea0"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
            >
              <Feather name="share" size={16} color="#8e8ea0" />
            </TouchableOpacity>

            {onRegenerate && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onRegenerate}
              >
                <MaterialIcons name="refresh" size={16} color="#8e8ea0" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Image Modal */}
        <Modal
          visible={selectedImage !== null}
          transparent={true}
          animationType="none"
          onRequestClose={() => setSelectedImage(null)}
        >
          <Animated.View style={[styles.modalOverlay, modalStyle]}>
            <TouchableOpacity
              style={styles.modalBackground}
              activeOpacity={1}
              onPress={() => setSelectedImage(null)}
            >
              <Animated.View style={[styles.modalContent, modalContentStyle]}>
                {selectedImage && (
                  <>
                    <Image
                      source={{ uri: selectedImage.uri }}
                      style={styles.modalImage}
                      resizeMode="contain"
                    />
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={styles.modalActionButton}
                        onPress={() => handleImageShare(selectedImage)}
                      >
                        <Feather name="share-2" size={20} color="#fff" />
                        <Text style={styles.modalActionText}>Share</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.modalActionButton}
                        onPress={() => handleImageSave(selectedImage.uri)}
                      >
                        <Feather name="download" size={20} color="#fff" />
                        <Text style={styles.modalActionText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.modalActionButton}
                        onPress={() => setSelectedImage(null)}
                      >
                        <Feather name="x" size={20} color="#fff" />
                        <Text style={styles.modalActionText}>Close</Text>
                      </TouchableOpacity>
                    </View>
                    {selectedImage.prompt && (
                      <View style={styles.modalPrompt}>
                        <Text style={styles.modalPromptText}>{selectedImage.prompt}</Text>
                      </View>
                    )}
                  </>
                )}
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        </Modal>
      </Animated.View>
    </Pressable>

  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 12,
  },
  messageContent: {
    flex: 1,
    minWidth: 0,
  },
  contentContainer: {
    paddingBottom: 12,
  },
  loadingContainer: {
    paddingVertical: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8e8ea0',
  },
  // Code Block Styles
  codeBlockContainer: {
    marginVertical: 12,
    borderRadius: 8,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: Colors.dark.borderColor,
    overflow: 'hidden',
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.dark.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderColor,
  },
  codeLanguage: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'lowercase',
  },
  copyButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: Colors.dark.bgPrimary,
  },
  codeScrollView: {
    maxHeight: 400,
  },
  codeText: {
    color: '#e2e8f0',
    fontFamily: 'Courier',
    fontSize: 14,
    lineHeight: 20,
    padding: 16,
  },
  // Image Gallery Styles
  imageGalleryContainer: {
    marginBottom: 16,
  },
  imageScrollContainer: {
    paddingVertical: 8,
    gap: 12,
  },
  imageContainer: {
    width: 200,
    marginRight: 12,
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f7f7f8',
  },
  generatedImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  imagePrompt: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
  },
  // Action Bar Styles
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionButtonActive: {
    backgroundColor: '#f7f7f8',
    borderColor: '#d1d5db',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: SCREEN_WIDTH - 40,
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 12,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 16,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  modalActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  modalPrompt: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    maxWidth: '100%',
  },
  modalPromptText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

const markdownStyles = StyleSheet.create({
  text: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'System',
  },
  paragraph: {
    marginBottom: 16,
    color: '#ffffff',
  },
  heading1: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 24,
    lineHeight: 36,
  },
  heading2: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 20,
    lineHeight: 32,
  },
  heading3: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 16,
    lineHeight: 28,
  },
  heading4: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 14,
    lineHeight: 26,
  },
  code_inline: {
    backgroundColor: '#1e1e1e',
    color: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'Courier',
    fontSize: 14,
  },
  blockquote: {
    backgroundColor: '#1f2937',
    borderLeftWidth: 4,
    borderLeftColor: '#4b5563',
    paddingLeft: 16,
    paddingVertical: 12,
    marginVertical: 16,
    borderRadius: 4,
  },
  list_item: {
    marginBottom: 8,
    color: '#ffffff',
  },
  bullet_list: {
    marginBottom: 16,
  },
  ordered_list: {
    marginBottom: 16,
  },
  strong: {
    fontWeight: '600',
    color: '#ffffff',
  },
  em: {
    fontStyle: 'italic',
    color: '#ffffff',
  },
  link: {
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  hr: {
    backgroundColor: '#374151',
    height: 1,
    marginVertical: 24,
  },
  table: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 6,
    marginVertical: 16,
  },
  thead: {
    backgroundColor: '#111827',
  },
  tbody: {},
  th: {
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontWeight: '600',
    color: '#ffffff',
  },
  td: {
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#d1d5db',
  },
});

export default AdvancedAIResponse;