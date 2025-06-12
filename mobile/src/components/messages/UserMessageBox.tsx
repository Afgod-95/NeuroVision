import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  GestureResponderEvent,
  TouchableOpacity,
  Dimensions,
  Image,
  Modal,
  Alert
} from 'react-native';
import { Colors } from '@/src/constants/Colors';
import Animated, {
  FadeInUp,
  FadeOut,
  FadeInDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import Feather from '@expo/vector-icons/Feather';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';
import { getUsernameInitials } from '@/src/constants/getUsernameInitials';
import { useMessageOptions } from '@/src/hooks/UserMessageOptions';
import { useDispatch } from 'react-redux';
import { setShowOptions } from '@/src/redux/slices/messageOptionsSlice';
import { useAudioPlayer, AudioSource } from 'expo-audio';
import { AudioPlayer } from '../audio/AudioPlayer';
import * as Clipboard from 'expo-clipboard';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Define message content types
export interface MessageContent {
  type: 'text' | 'audio' | 'image' | 'mixed';
  text?: string;
  audioUrl?: string;
  audioName?: string;
  audioDuration?: number;
  imageUrl?: string;
  imageName?: string;
  imageWidth?: number;
  imageHeight?: number;
}

type MessagesProps = {
  message: string;
  messageId: string;
  userMessage: boolean;
  messageContent?: MessageContent;
  copyMessage?: () => void;
  editMessage?: () => void;
};



const ImageViewer = ({
  imageUrl,
  imageName,
  imageWidth,
  imageHeight
}: {
  imageUrl: string;
  imageName?: string;
  imageWidth?: number;
  imageHeight?: number;
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 200, height: 150 });



  React.useEffect(() => {
    if (imageWidth && imageHeight) {
      // Calculate display size while maintaining aspect ratio
      const maxWidth = 250;
      const maxHeight = 200;
      const aspectRatio = imageWidth / imageHeight;

      let displayWidth = maxWidth;
      let displayHeight = maxWidth / aspectRatio;

      if (displayHeight > maxHeight) {
        displayHeight = maxHeight;
        displayWidth = maxHeight * aspectRatio;
      }

      setImageDimensions({ width: displayWidth, height: displayHeight });
    }
  }, [imageWidth, imageHeight]);

  return (
    <>
      <TouchableOpacity onPress={() => setIsModalVisible(true)}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={[styles.messageImage, imageDimensions]}
            resizeMode="cover"
          />
          {imageName && (
            <Text style={styles.imageName} numberOfLines={1}>
              {imageName}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsModalVisible(false)}
          />
          <View style={styles.modalContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Feather name="x" size={24} color={Colors.dark.txtPrimary} />
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>
    </>
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
  //getting user profile
  const { user: userCredentials } = useSelector((state: RootState) => state.user);
  const { isEdited } = useSelector((state: RootState) => state.messageOptions);
  const {
    handlePressIn,
    handlePressOut,
    handleLongPress,
    animatedStyle
  } = useMessageOptions();

  const renderMessageContent = () => {
    if (!messageContent) {
      // Fallback to text message
      return <Text style={styles.messageText}>{message}</Text>;
    }

    switch (messageContent.type) {
      case 'text':
        return <Text style={styles.messageText}>{messageContent.text || message}</Text>;

      case 'audio':
        return (
          <View>
            {messageContent.text && (
              <Text style={[styles.messageText, { marginBottom: 8 }]}>
                {messageContent.text}
              </Text>
            )}
            <AudioPlayer
              audioUrl={messageContent.audioUrl!}
              audioDuration={messageContent.audioDuration}
              audioName={messageContent.audioName}
            />
          </View>
        );

      case 'image':
        return (
          <View>
            {messageContent.text && (
              <Text style={[styles.messageText, { marginBottom: 8 }]}>
                {messageContent.text}
              </Text>
            )}
            <ImageViewer
              imageUrl={messageContent.imageUrl!}
              imageName={messageContent.imageName}
              imageWidth={messageContent.imageWidth}
              imageHeight={messageContent.imageHeight}
            />
          </View>
        );

      case 'mixed':
        return (
          <View>
            {messageContent.text && (
              <Text style={[styles.messageText, { marginBottom: 8 }]}>
                {messageContent.text}
              </Text>
            )}
            {messageContent.imageUrl && (
              <View style={{ marginBottom: 8 }}>
                <ImageViewer
                  imageUrl={messageContent.imageUrl}
                  imageName={messageContent.imageName}
                  imageWidth={messageContent.imageWidth}
                  imageHeight={messageContent.imageHeight}
                />
              </View>
            )}
            {messageContent.audioUrl && (
              <AudioPlayer
                audioUrl={messageContent.audioUrl}
                audioDuration={messageContent.audioDuration}
                audioName={messageContent.audioName}
              />
            )}
          </View>
        );

      default:
        return <Text style={styles.messageText}>{message}</Text>;
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      exiting={FadeOut.duration(200)}
    >
      <Animated.View
       
        style={[animatedStyle]}
      >
        <Pressable
          onLongPress={(e) => handleLongPress(e, message)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.messageContainer,
            { alignSelf: userMessage ? 'flex-end' : 'flex-start' },
            messageContent?.type === 'image' && styles.imageMessageContainer,
          ]}
        >
          {renderMessageContent()}
        </Pressable>

        {isEdited && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            exiting={FadeOut.duration(200)}
          >
            <Text style={styles.editedMessage}>Edited</Text>
          </Animated.View>

        )}
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
    backgroundColor: Colors.dark.button,
    maxWidth: 300,
    padding: 10,
    borderRadius: 15,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  imageMessageContainer: {
    padding: 5,
    maxWidth: 320,
  },
  popupContainer: {
    position: 'absolute',
    zIndex: 10,
    width: 280,
    maxWidth: SCREEN_WIDTH - 20,
  },
  messageText: {
    color: Colors.dark.txtPrimary,
    fontSize: 16,
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
  editedMessage: {
    color: Colors.dark.txtPrimary,
    fontSize: 13,
    alignSelf: 'flex-end',
    marginTop: 3,
    marginBottom: 3,
  },
  userCont: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  userAccountButton: {
    width: 40,
    height: 40,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userText: {
    color: Colors.dark.txtPrimary,
    fontSize: 14,
    fontFamily: 'Manrope-ExtraBold',
  },

  // Image Viewer Styles
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  messageImage: {
    borderRadius: 8,
  },
  imageName: {
    color: Colors.dark.txtSecondary,
    fontSize: 12,
    marginTop: 4,
    paddingHorizontal: 4,
  },
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

  copiedButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  copiedText: {
    color: '#22c55e',
    fontSize: 14
  },
});

export default UserMessageBox;