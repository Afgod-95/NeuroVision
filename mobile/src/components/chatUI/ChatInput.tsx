import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Dimensions,
  Pressable,
  TouchableWithoutFeedback,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/Colors';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';
import Feather from '@expo/vector-icons/Feather';
import AntDesign from '@expo/vector-icons/AntDesign';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence
} from 'react-native-reanimated'
import { useDispatch } from 'react-redux';
import { resetOptions } from '@/src/redux/slices/messageOptionsSlice';
import { MaterialIcons } from '@expo/vector-icons';
import { deleteAudioFile, uploadAudioFile } from '@/src/constants/audio/AudioService';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';

const SCREEN_WIDTH = Dimensions.get('screen').width;

type ChatInputProps = {
  message: string;
  isEdited: boolean,
  setMessage: (message: string) => void;
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
  onSendMessage?: (message: string, audioFile?: UploadedAudioFile) => void;
};

type AudioUploadState = {
  isUploading: boolean;
  fileName: string;
  progress: number;
  fileSize?: string;
  error?: string;
};

export type UploadedAudioFile = {
  id: string;
  fileName: string;
  fileSize?: string;
  uploadResult?: any;
  uri?: string;
  transcription?: string;
};

const ChatInput = ({
  message,
  setMessage,
  isEdited,
  isRecording,
  setIsRecording,
  onSendMessage
}: ChatInputProps) => {
  const { user: userCredentials } = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch();

  const [isMorePressed, setIsMorePressed] = useState(false);
  const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);
  const [audioUpload, setAudioUpload] = useState<AudioUploadState | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<UploadedAudioFile | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Animation values
  const progressValue = useSharedValue(0);
  const pulseValue = useSharedValue(1);


  // Utility functions
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const simulateUploadProgress = useCallback(() => {
    progressValue.value = 0;
    progressValue.value = withTiming(100, { duration: 3000 });
    
    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const resetAnimations = useCallback(() => {
    progressValue.value = 0;
    pulseValue.value = withTiming(1, { duration: 200 });
  }, []);

  // Menu handlers
  const handleMoreMenu = useCallback(() => {
    setIsMorePressed(!isMorePressed);
    setIsMoreMenuVisible(true);
  }, [isMorePressed]);

  const handleMoreMenuClose = useCallback(() => {
    setIsMorePressed(false);
    setIsMoreMenuVisible(false);
  }, []);

  // Audio transcription
  const transcribeAudio = useCallback(async (audioUrl: string, userId: string) => {
    try {
      setIsTranscribing(true);
      const result = await axios.post('/api/user/transcribe-audio', {
        userId,
        audioUrl
      });
      
      const { transcriptionResult } = result.data;
      if (transcriptionResult.status === 'complete') {
        return transcriptionResult.text;
      }
      return null;
    } catch (error) {
      console.error('Transcription error:', error);
      Alert.alert('Transcription Failed', 'Could not transcribe the audio file.');
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  
//Store the file path along with the audio URL
const [audioFilePath, setAudioFilePath] = useState('');

// Update the handleUpload function to store the file path
const handleUpload = useCallback(async () => {
  try {
    if (!userCredentials?.id) {
      Alert.alert('Error', 'User credentials not found');
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const file = result.assets[0];
    
    // Validate file size (e.g., max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size && file.size > maxSize) {
      Alert.alert('File Too Large', 'Please select an audio file smaller than 50MB.');
      return;
    }

    setAudioUpload({
      isUploading: true,
      fileName: file.name,
      progress: 0,
      fileSize: file.size ? formatFileSize(file.size) : undefined
    });

    setIsMoreMenuVisible(false);
    simulateUploadProgress();

    try {
      const uploadResult = await uploadAudioFile(userCredentials.id, file);
      console.log('Audio uploaded successfully:', uploadResult);
      
      const uploadUrl = uploadResult.signedUrl;
      const filePath = uploadResult.id; // This is the file path
      
      setAudioUrl(uploadUrl);
      setAudioFilePath(filePath); // Store the file path

      // Complete upload
      setAudioUpload(prev => prev ? { ...prev, progress: 100, isUploading: false } : null);
      resetAnimations();

      // Get transcription
      const transcription = await transcribeAudio(uploadUrl, userCredentials.id.toString());

      const uploadedFile: UploadedAudioFile = {
        id: uploadResult?.id || Date.now().toString(),
        fileName: file.name,
        fileSize: file.size ? formatFileSize(file.size) : undefined,
        uploadResult: uploadResult,
        uri: file.uri,
        transcription: transcription || undefined
      };

      setUploadedAudio(uploadedFile);

      // Clear upload state
      setTimeout(() => {
        setAudioUpload(null);
        progressValue.value = 0;
      }, 1500);

    } catch (uploadError: any) {
      console.error('Upload error:', uploadError);
      
      // Handle duplicate file 
      if (uploadError.message?.includes('already exists')) {
        setAudioUpload(prev => prev ? {
          ...prev,
          progress: 100,
          isUploading: false
        } : null);
        
        const uploadedFile: UploadedAudioFile = {
          id: Date.now().toString(),
          fileName: file.name,
          fileSize: file.size ? formatFileSize(file.size) : undefined,
          uri: file.uri
        };
        setUploadedAudio(uploadedFile);
        
        setTimeout(() => {
          setAudioUpload(null);
          progressValue.value = 0;
        }, 1500);
      } else {
        // Show error
        setAudioUpload(prev => prev ? {
          ...prev,
          isUploading: false,
          progress: 0,
          error: 'Upload failed. Please try again.'
        } : null);
        
        setTimeout(() => {
          setAudioUpload(null);
          progressValue.value = 0;
        }, 3000);
      }
      resetAnimations();
    }
  } catch (error) {
    console.error('File picker error:', error);
    Alert.alert('Error', 'Failed to select audio file.');
    setAudioUpload(null);
    resetAnimations();
  }
}, [userCredentials, formatFileSize, simulateUploadProgress, resetAnimations, transcribeAudio]);

// 3. Fix the handleCancelUpload function
const handleCancelUpload = useCallback(async () => {
  try {
    if (audioFilePath) {
      await deleteAudioFile(audioFilePath); 
    }
  } catch (error) {
    console.error('Error deleting audio file:', error);
    // Don't show alert here as deleteAudioFile already shows one
  } finally {
    setAudioUpload(null);
    setAudioFilePath('');
    resetAnimations();
  }
}, [audioFilePath, resetAnimations]);

//handleRemoveUploadedAudio function
const handleRemoveUploadedAudio = useCallback(async () => {
  try {
    if (audioFilePath) {
      await deleteAudioFile(audioFilePath); 
    } else if (uploadedAudio?.uploadResult?.id) {
      await deleteAudioFile(uploadedAudio.uploadResult.id); 
    }
  } catch (error) {
    console.error('Error deleting uploaded audio:', error);
    // Don't show alert here as deleteAudioFile already shows one
  } finally {
    setUploadedAudio(null);
    setAudioUrl('');
    setAudioFilePath('');
  }
}, [audioFilePath, uploadedAudio]);

// 5. Clear file path when sending message
const handleSendMessage = useCallback(async () => {
  const hasMessage = message.trim();
  const hasAudio = uploadedAudio;
  
  if (!hasMessage && !hasAudio) return;

  try {
    // If there's audio but no transcription yet, handle it
    if (hasAudio && !hasAudio.transcription && audioUrl && userCredentials?.id) {
      const transcription = await transcribeAudio(audioUrl, userCredentials?.id?.toString());
      if (transcription) {
        const updatedAudio = { ...hasAudio, transcription };
        setUploadedAudio(updatedAudio);
        onSendMessage?.(message, updatedAudio);
      } else {
        onSendMessage?.(message, hasAudio);
      }
    } else {
      onSendMessage?.(message, hasAudio || undefined);
    }

    // Clear inputs
    setMessage('');
    setUploadedAudio(null);
    setAudioUrl('');
    setAudioFilePath(''); // Clear file path
  } catch (error) {
    console.error('Send message error:', error);
    Alert.alert('Error', 'Failed to send message. Please try again.');
  }
}, [message, uploadedAudio, audioUrl, userCredentials, transcribeAudio, onSendMessage, setMessage]);

  const handleMicPress = useCallback(() => {
    setIsRecording(!isRecording);
    console.log('Microphone pressed, recording:', !isRecording);
  }, [isRecording, setIsRecording]);

  // Animated styles
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value}%`,
  }));

  const audioContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
  }));

  // Components
  const EditedMessagePrompt = () => {
    const { isEdited } = useSelector((state: RootState) => state.messageOptions);
    
    const clearMessage = useCallback(() => {
      dispatch(resetOptions());
      setMessage('');
    }, []);

    if (!isEdited) return null;

    return (
      <Animated.View
        style={styles.searchContainer}
        exiting={FadeOutUp.delay(1).duration(10)}
        entering={FadeInUp}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={styles.searchIcon}>
            <Feather name="edit-2" size={20} color={Colors.dark.txtSecondary} />
          </View>
          <Text style={styles.text}>Editing Message</Text>
        </View>

        {message.length > 0 && (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <TouchableOpacity 
              onPress={clearMessage}
              style={[styles.searchIcon, { marginLeft: 10, marginRight: 0 }]}
            >
              <AntDesign name="closecircle" size={20} color={Colors.dark.txtSecondary} />
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  const AudioUploadComponent = () => {
    if (!audioUpload) return null;

    return (
      <View style={styles.audioUploadWrapper}>
        <Animated.View
          entering={FadeInUp.springify().damping(15).mass(1).stiffness(200)}
          exiting={FadeOutUp}
          style={styles.audioUploadContainer}
        >
          <Animated.View style={audioContainerStyle}>
            <View style={styles.audioUploadContent}>
              <View style={styles.audioIconContainer}>
                <MaterialIcons
                  name="audiotrack"
                  size={20}
                  color={audioUpload.isUploading ? Colors.dark.txtSecondary : Colors.dark.txtPrimary}
                />
              </View>

              <View style={styles.audioDetails}>
                <Text style={styles.audioFileName} numberOfLines={1}>
                  {audioUpload.fileName}
                </Text>
                {audioUpload.fileSize && (
                  <Text style={styles.audioFileSize}>
                    {audioUpload.fileSize}
                  </Text>
                )}
                {audioUpload.error && (
                  <Text style={styles.audioError}>
                    {audioUpload.error}
                  </Text>
                )}
                {isTranscribing && (
                  <Text style={styles.transcribingText}>
                    Transcribing...
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={handleCancelUpload}
                style={styles.cancelUploadButton}
              >
                <AntDesign name="close" size={16} color={Colors.dark.txtSecondary} />
              </TouchableOpacity>
            </View>

            {audioUpload.isUploading && (
              <View style={styles.progressBarContainer}>
                <Animated.View style={[styles.progressBar, progressBarStyle]} />
              </View>
            )}

            {!audioUpload.isUploading && audioUpload.progress === 100 && !audioUpload.error && (
              <View style={styles.uploadCompleteContainer}>
                <AntDesign name="checkcircle" size={16} color="#10B981" />
                <Text style={styles.uploadCompleteText}>Upload complete</Text>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    );
  };

  const UploadedAudioComponent = () => {
    if (!uploadedAudio) return null;

    return (
      <View style={styles.audioUploadWrapper}>
        <Animated.View
          entering={FadeInUp.springify().damping(15).mass(1).stiffness(200)}
          style={styles.uploadedAudioContainer}
        >
          <View style={styles.audioUploadContent}>
            <View style={[styles.audioIconContainer, styles.uploadedAudioIcon]}>
              <MaterialIcons
                name="audiotrack"
                size={20}
                color={Colors.dark.txtPrimary}
              />
            </View>

            <View style={styles.audioDetails}>
              <Text style={styles.audioFileName} numberOfLines={1}>
                {uploadedAudio.fileName}
              </Text>
              {uploadedAudio.fileSize && (
                <Text style={styles.audioFileSize}>
                  {uploadedAudio.fileSize}
                </Text>
              )}
              <Text style={styles.readyToSendText}>
                {uploadedAudio.transcription ? 'Transcribed & Ready' : 'Ready to send'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleRemoveUploadedAudio}
              style={styles.cancelUploadButton}
            >
              <AntDesign name="close" size={16} color={Colors.dark.txtSecondary} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  };

  const MoreMenu = () => {
    if (!isMoreMenuVisible) return null;

    return (
      <TouchableWithoutFeedback onPress={handleMoreMenuClose}>
        <Animated.View
          entering={FadeInUp.springify().damping(10).mass(1).stiffness(100)}
          exiting={FadeOutDown}
          style={styles.moreMenuContainer}
        >
          <TouchableOpacity
            onPress={handleUpload}
            style={styles.moreMenuItem}
            disabled={audioUpload?.isUploading || isTranscribing}
          >
            <Text style={styles.text}>Transcribe Audio</Text>
            <MaterialIcons 
              name="drive-folder-upload" 
              size={24} 
              color={Colors.dark.txtPrimary} 
            />
          </TouchableOpacity>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  };

  const canSendMessage = (message.trim() || uploadedAudio) && !isTranscribing;

  return (
    <>
      <View style={styles.container}>
        <EditedMessagePrompt />
        <AudioUploadComponent />
        <UploadedAudioComponent />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask anything"
            placeholderTextColor="#9CA3AF"
            value={message}
            onChangeText={setMessage}
            multiline
            editable={!isTranscribing}
          />
        </View>

        <View style={styles.iconsContainer}>
          <Pressable onPress={handleMoreMenu} disabled={isTranscribing}
            style = {{ }}
          >
            <AntDesign 
              name="plus" 
              size={24}
              color={ Colors.dark.txtPrimary }
            />
          </Pressable>
          
          <View style={styles.iconContainer}>
            <TouchableOpacity
              style={[
                styles.iconButton,
                isRecording && styles.recordingButton,
                { borderWidth: isRecording ? 0 : 1, borderColor: Colors.dark.borderColor }
              ]}
              onPress={handleMicPress}
              activeOpacity={0.7}
              disabled={isTranscribing}
            >
              <Ionicons
                name={isRecording ? "mic" : "mic-outline"}
                size={20}
                color={isRecording ? Colors.dark.bgPrimary : Colors.dark.txtSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.iconButton,
                canSendMessage && styles.recordingButton,
                {
                  borderWidth: canSendMessage ? 0 : 1,
                  borderColor: Colors.dark.borderColor,
                }
              ]}
              onPress={handleSendMessage}
              activeOpacity={0.7}
              disabled={!canSendMessage}
            >
              <Ionicons
                name="send"
                size={17}
                color={canSendMessage ? Colors.dark.bgPrimary : Colors.dark.txtSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <MoreMenu />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopEndRadius: 30,
    borderTopStartRadius: 30,
    paddingVertical: 12,
    paddingBottom: 35,
    backgroundColor: Colors.dark.bgSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    color: '#F9FAFB',
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 100,
    paddingVertical: 0,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: Colors.dark.txtPrimary,
  },
  iconsContainer: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between'
  },
  searchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Colors.dark.bgPrimary,
    borderRadius: 20,
    paddingHorizontal: 12,
    width: SCREEN_WIDTH - 20,
    height: 40,
  },
  searchIcon: {
    marginRight: 10,
  },
  text: {
    color: Colors.dark.txtSecondary,
    fontSize: 14,
    fontWeight: 'bold'
  },
  // Audio Upload Styles
  audioUploadWrapper: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  audioUploadContainer: {
    backgroundColor: Colors.dark.bgPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.borderColor,
    overflow: 'hidden',
  },
  uploadedAudioContainer: {
    backgroundColor: Colors.dark.bgPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    overflow: 'hidden',
  },
  audioUploadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  audioIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dark.bgSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  uploadedAudioIcon: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  audioDetails: {
    flex: 1,
  },
  audioFileName: {
    color: Colors.dark.txtPrimary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  audioFileSize: {
    color: Colors.dark.txtSecondary,
    fontSize: 12,
  },
  audioError: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 2,
  },
  transcribingText: {
    color: Colors.dark.txtSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  readyToSendText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  cancelUploadButton: {
    padding: 4,
  },
  progressBarContainer: {
    height: 2,
    backgroundColor: Colors.dark.bgSecondary,
    marginTop: -1,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.dark.txtPrimary,
  },
  uploadCompleteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  uploadCompleteText: {
    color: '#10B981',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  moreMenuContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
    justifyContent: 'center',
    left: 15,
    width: 200,
    minHeight: 100,
    borderWidth: 1,
    backgroundColor: Colors.dark.bgPrimary,
    borderColor: Colors.dark.borderColor,
    borderRadius: 15,
  },
  moreMenuItem: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between'
  },
});

export default ChatInput;