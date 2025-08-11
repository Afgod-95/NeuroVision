import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Dimensions,
  Image,
  Modal,
  TouchableNativeFeedback,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@/src/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useCodeBlock } from './AIResponseUI/CodeBlocks';
import useLoadingDots from './AIResponseUI/useLoadingDots';
import { AIResponseProps, GeneratedImage } from '@/src/utils/types/Types';
import useImageGallery from './AIResponseUI/ImageGallery';
import { useRealtimeChatState } from '@/src/hooks/chat/states/useRealtimeChatStates';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AdvancedAIResponse = ({
  message,
  loading = true,
  onRegenerate,
  onFeedback,
  isTyping,
  messageId,
  generatedImages = [],
  onImageSave,
}: AIResponseProps) => {
  const [isLiked, setIsLiked] = useState<'like' | 'dislike' | null>(null);

  const { isAborted, showAIButtons } = useRealtimeChatState()
  //code block component
  const {
    renderCustomMarkdown,
    setCopiedStates,
    mainCopied,
    setMainCopied
  }
    = useCodeBlock();
  const { startTypingAnimation, LoadingDots } = useLoadingDots();

  //image gallery
  const { ImageGallery, selectedImage, setSelectedImage } = useImageGallery();

  // Reanimated shared values
  const fadeOpacity = useSharedValue(0);
  const modalOpacity = useSharedValue(0);
  const modalScale = useSharedValue(0.8);

  // Animated styles
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
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

  // Determine if action bar should be shown
  const shouldShowActionBar = isAborted && showAIButtons || !isTyping;

  if (loading) {
    return (
      <LoadingDots />
    );
  }

  return (
    <>
      <TouchableNativeFeedback>
        <Animated.View style={[styles.container, fadeStyle]}>
          <View style={styles.messageContent}>
            {/* Generated Images */}
            <ImageGallery images={generatedImages} />

            {/* Content */}
            <View style={styles.contentContainer}>
              {renderCustomMarkdown(message)}
            </View>

            {/* Action Bar - Show when not typing OR when aborted */}
            {shouldShowActionBar && (
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
                    <MaterialIcons name="refresh" size={20} color="#8e8ea0" />
                  </TouchableOpacity>
                )}
              </View>
            )}
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
      </TouchableNativeFeedback>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  messageContent: {
    flex: 1,
    minWidth: 0,
  },
  contentContainer: {
    paddingBottom: 12,
    flex: 1,
  },

  // Action Bar Styles
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    backgroundColor: Colors.dark.bgSecondary,
    borderColor: Colors.dark.borderColor,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
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
    backgroundColor: 'rgba(33, 38, 45, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  modalActionText: {
    color: '#f0f6fc',
    fontSize: 14,
    fontWeight: '500',
  },
  modalPrompt: {
    marginTop: 16,
    backgroundColor: 'rgba(33, 38, 45, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  modalPromptText: {
    color: '#f0f6fc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AdvancedAIResponse;