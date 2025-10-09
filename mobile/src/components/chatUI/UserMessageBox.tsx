import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Dimensions,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { Colors } from '@/src/constants/Colors';
import Animated, {
  FadeInUp,
  FadeOut,
  FadeInDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import Feather from '@expo/vector-icons/Feather';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/src/redux/store';
import { setShowOptions } from '@/src/redux/slices/messageOptionsSlice';
import { useMessageOptions } from '@/src/hooks/userMessagePreview/useMessageOptions';
import { AudioPlayer } from '../audio/AudioPlayer';
import * as Clipboard from 'expo-clipboard';
import { MessageContent, FileAttachment } from '@/src/utils/interfaces/TypescriptInterfaces';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type MessagesProps = {
  message: string;
  messageId: string;
  userMessage: boolean;
  messageContent?: MessageContent;
  copyMessage?: () => void;
  editMessage?: () => void;
};

// Helper function to check if file is an image
const isImageFile = (fileName: string, fileType: string): boolean => {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'];
  const lowerFileName = fileName?.toLowerCase() || '';
  const lowerFileType = fileType?.toLowerCase() || '';
  
  return lowerFileType.includes('image') || 
         imageExtensions.some(ext => lowerFileName.endsWith(ext));
};

// Helper function to get file icon
const getFileIcon = (type: string): keyof typeof Ionicons.glyphMap => {
  const lowerType = type?.toLowerCase() || '';
  if (lowerType.includes('pdf')) return 'document-text';
  if (lowerType.includes('video')) return 'videocam';
  if (lowerType.includes('audio')) return 'musical-notes';
  if (lowerType.includes('word')) return 'document-text';
  if (lowerType.includes('excel') || lowerType.includes('spreadsheet')) return 'grid';
  return 'document';
};

// Helper function to format file size
const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return '';
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

// Helper function to get image URI from file
const getImageUri = (file: FileAttachment): string => {
  console.log('🖼️ Getting image URI for:', file.name, {
    hasUri: !!file.uri,
    hasThumbnail: !!file.thumbnail,
    hasBase64: !!(file as any).base64,
  });

  // Try different possible URI sources
  if (file.uri) {
    console.log('✅ Using file.uri');
    return file.uri;
  }
  if (file.thumbnail) {
    console.log('✅ Using file.thumbnail');
    return file.thumbnail;
  }
  if ((file as any).base64) {
    // Convert base64 to data URI if needed
    const base64 = (file as any).base64;
    if (base64.startsWith('data:')) {
      console.log('✅ Using base64 (already has data: prefix)');
      return base64;
    }
    console.log('✅ Converting base64 to data URI');
    return `data:${file.type};base64,${base64}`;
  }
  console.warn('❌ No valid image URI found for:', file.name);
  return '';
};

// Image Grid Component (for multiple images)
const ImageGrid = ({ images }: { images: FileAttachment[] }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const imageCount = images.length;
  
  const getGridStyle = () => {
    if (imageCount === 1) return styles.singleImage;
    if (imageCount === 2) return styles.doubleImage;
    return styles.gridImage;
  };

  console.log('📸 ImageGrid rendering:', {
    imageCount,
    images: images.map(img => ({
      name: img.name,
      uri: getImageUri(img).substring(0, 50)
    }))
  });

  return (
    <>
      <View style={[styles.imageGrid, imageCount === 2 && styles.imageGridDouble]}>
        {images.slice(0, 4).map((img, index) => {
          const imageUri = getImageUri(img);
          
          if (!imageUri) {
            console.warn('⚠️ Skipping image with no URI:', img.name);
            return null;
          }

          return (
            <TouchableOpacity
              key={img.id}
              onPress={() => setSelectedImage(imageUri)}
              style={[getGridStyle(), index === 3 && imageCount > 4 && styles.lastImageOverlay]}
            >
              <Image
                source={{ uri: imageUri }}
                style={styles.gridImageContent}
                resizeMode="cover"
                onError={(error) => {
                  console.error('❌ Image failed to load:', img.name, error.nativeEvent.error);
                }}
                onLoad={() => {
                  console.log('✅ Image loaded successfully:', img.name);
                }}
              />
              {index === 3 && imageCount > 4 && (
                <View style={styles.moreImagesOverlay}>
                  <Text style={styles.moreImagesText}>+{imageCount - 4}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Full Screen Image Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedImage(null)}
          />
          <View style={styles.modalContainer}>
            <Image
              source={{ uri: selectedImage || '' }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedImage(null)}
            >
              <Feather name="x" size={24} color={Colors.dark.txtPrimary} />
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>
    </>
  );
};

// Document Item Component
const DocumentItem = ({ file }: { file: FileAttachment }) => {
  return (
    <View style={styles.documentItem}>
      <View style={styles.documentIcon}>
        <Ionicons name={getFileIcon(file.type)} size={24} color="#60A5FA" />
      </View>
      <View style={styles.documentInfo}>
        <Text style={styles.documentName} numberOfLines={1}>
          {file.name}
        </Text>
        {file.size && (
          <Text style={styles.documentSize}>{formatFileSize(file.size)}</Text>
        )}
      </View>
      <TouchableOpacity style={styles.downloadButton}>
        <Ionicons name="download-outline" size={20} color={Colors.dark.txtSecondary} />
      </TouchableOpacity>
    </View>
  );
};

// Attachments Renderer Component
const AttachmentsRenderer = ({ files }: { files: FileAttachment[] }) => {
  // Separate images from other files
  const images = files.filter(file => isImageFile(file.name, file.type));
  const documents = files.filter(file => !isImageFile(file.name, file.type));

  console.log('📎 Rendering attachments:', {
    totalFiles: files.length,
    images: images.length,
    documents: documents.length,
    imageDetails: images.map(img => ({
      name: img.name,
      type: img.type,
      hasUri: !!img.uri,
      hasBase64: !!(img as any).base64,
      uriPreview: getImageUri(img).substring(0, 50)
    }))
  });

  return (
    <View style={styles.attachmentsContainer}>
      {/* Render Images in Grid */}
      {images.length > 0 && (
        <View style={styles.imagesSection}>
          <ImageGrid images={images} />
        </View>
      )}

      {/* Render Documents */}
      {documents.length > 0 && (
        <View style={styles.documentsSection}>
          {documents.map(doc => (
            <DocumentItem key={doc.id} file={doc} />
          ))}
        </View>
      )}
    </View>
  );
};

const UserMessageBox = ({
  message,
  messageId,
  userMessage,
  messageContent,
  copyMessage,
  editMessage,
}: MessagesProps) => {
  const {
    handlePressIn,
    handlePressOut,
    handleLongPress,
    animatedStyle
  } = useMessageOptions();

  const renderMessageContent = () => {
    const hasFiles = messageContent?.files && messageContent.files.length > 0;
    const hasText = message || messageContent?.text;

    console.log('🎨 Rendering message:', {
      messageId,
      hasFiles,
      filesCount: messageContent?.files?.length || 0,
      hasText,
      contentType: messageContent?.type,
      files: messageContent?.files?.map(f => ({
        name: f.name,
        type: f.type,
        hasUri: !!(f as any).uri,
        hasBase64: !!(f as any).base64,
      }))
    });

    return (
      <View style={styles.messageContentWrapper}>
        {/* ✅ FILES FIRST - Like ChatGPT */}
        {hasFiles && (
          <View style={styles.filesContainer}>
            <AttachmentsRenderer files={messageContent!.files!} />
          </View>
        )}

        {/* Audio (if present) */}
        {messageContent?.audioUrl && (
          <View style={hasFiles || hasText ? styles.audioContainer : undefined}>
            <AudioPlayer
              audioUrl={messageContent.audioUrl}
              audioDuration={messageContent.audioDuration}
              audioName={messageContent.audioName}
            />
          </View>
        )}

        {/* ✅ TEXT LAST - Below files like ChatGPT */}
        {hasText && (
          <View style={hasFiles ? styles.textAfterFiles : undefined}>
            <Text style={styles.messageText}>
              {messageContent?.text || message}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      exiting={FadeOut.duration(200)}
    >
      <Animated.View style={[animatedStyle]}>
        <Pressable
          onLongPress={(e) => handleLongPress(e, message)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.messageContainer,
            { alignSelf: userMessage ? 'flex-end' : 'flex-start' },
            messageContent?.files && styles.messageContainerWithFiles,
          ]}
        >
          {renderMessageContent()}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

export const MessagePreview = ({
  editMessage,
}: MessagesProps) => {
  const dispatch = useDispatch();
  const { showOptions, touchPos, showAbove, message } = useSelector(
    (state: RootState) => state.messageOptions
  );

  const [mainCopied, setMainCopied] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setMainCopied(true);
      setTimeout(() => setMainCopied(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy content');
    }
  };

  return (
    <>
      {showOptions && (
        <BlurView
          intensity={80}
          tint="dark"
          style={[
            StyleSheet.absoluteFill,
            {
              zIndex: 9999,
              position: 'absolute',
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => dispatch(setShowOptions(false))}
          />

          <Animated.View
            entering={FadeInUp.springify()}
            style={[
              styles.popupContainer,
              {
                top: touchPos.y,
                left: touchPos.x,
              },
            ]}
          >
            {showAbove ? (
              <>
                <View style={styles.optionBox}>
                  <Pressable
                    onPress={() => handleCopy(message ?? '')}
                    style={[styles.optionButton, mainCopied && styles.copiedButton]}
                  >
                    <Feather
                      name={mainCopied ? "check" : "copy"}
                      size={16}
                      color={mainCopied ? "#22c55e" : Colors.dark.txtSecondary}
                    />
                    <Text style={[styles.optionText, mainCopied && styles.copiedText]}>
                      {mainCopied ? 'Copied!' : 'Copy'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={editMessage} style={styles.optionButton}>
                    <Feather name="edit-2" size={20} color={Colors.dark.txtPrimary} />
                    <Text style={styles.optionText}>Edit</Text>
                  </Pressable>
                </View>
                <View style={styles.messagePreview}>
                  <Text style={styles.previewText} numberOfLines={3}>
                    {message}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.messagePreview}>
                  <Text style={styles.previewText} numberOfLines={3}>
                    {message}
                  </Text>
                </View>
                <View style={styles.optionBox}>
                  <Pressable
                    onPress={() => handleCopy(message ?? '')}
                    style={[styles.optionButton, mainCopied && styles.copiedButton]}
                  >
                    <Feather
                      name={mainCopied ? "check" : "copy"}
                      size={16}
                      color={mainCopied ? "#22c55e" : Colors.dark.txtSecondary}
                    />
                    <Text style={[styles.optionText, mainCopied && styles.copiedText]}>
                      {mainCopied ? 'Copied!' : 'Copy'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={editMessage} style={styles.optionButton}>
                    <Feather name="edit-2" size={20} color={Colors.dark.txtSecondary} />
                    <Text style={styles.optionText}>Edit</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Animated.View>
        </BlurView>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    maxWidth: 300,
    borderRadius: 16,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  messageContainerWithFiles: {
    maxWidth: 320,
  },
  messageContentWrapper: {
    // Wrapper for all content
  },
  filesContainer: {
    // Container for files/images
  },
  audioContainer: {
    marginTop: 8,
  },
  textAfterFiles: {
    marginTop: 8, // Space between files and text
  },
  messageText: {
    color: Colors.dark.txtPrimary,
    fontSize: 16,
    backgroundColor: Colors.dark.button,
    padding: 10,
    borderRadius: 16,
  },
  attachmentsContainer: {
    gap: 8,
  },
  imagesSection: {
    // No extra margins
  },
  documentsSection: {
    gap: 8,
  },

  // Image Grid Styles
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageGridDouble: {
    gap: 4,
  },
  singleImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  doubleImage: {
    width: '49%',
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridImage: {
    width: '49%',
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridImageContent: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.dark.bgSecondary, // Placeholder while loading
  },
  lastImageOverlay: {
    position: 'relative',
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: Colors.dark.txtPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },

  // Document Styles
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.dark.borderColor,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
    gap: 4,
  },
  documentName: {
    color: Colors.dark.txtPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  documentSize: {
    color: Colors.dark.txtSecondary,
    fontSize: 12,
  },
  downloadButton: {
    padding: 8,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullScreenImage: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT - 100,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Message Preview Styles
  popupContainer: {
    position: 'absolute',
    zIndex: 10,
    width: 280,
    maxWidth: SCREEN_WIDTH - 20,
  },
  messagePreview: {
    backgroundColor: Colors.dark.button,
    borderRadius: 10,
    marginBottom: 10,
    marginVertical: 10,
    padding: 10,
    width: '100%',
  },
  previewText: {
    color: Colors.dark.txtPrimary,
    fontSize: 18,
  },
  optionBox: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 10,
    minWidth: 150,
    maxWidth: 280,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: Colors.dark.borderColor,
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingBlock: 10,
    paddingTop: 10,
  },
  optionText: {
    color: Colors.dark.txtPrimary,
    fontSize: 18,
  },
  copiedButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  copiedText: {
    color: '#22c55e',
    fontSize: 14,
  },
});

export default UserMessageBox;