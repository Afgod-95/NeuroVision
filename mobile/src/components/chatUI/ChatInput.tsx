import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/Colors';
import Feather from '@expo/vector-icons/Feather';
import { useDispatch, useSelector } from 'react-redux';
import { resetOptions, setMessage as setMessageOption } from '@/src/redux/slices/messageOptionsSlice';
import { setIsRecording, setMessage } from '@/src/redux/slices/chatSlice';
import { RootState } from '@/src/redux/store';
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
} from 'expo-audio';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import UploadedFiles, { UploadedFile } from './uploaded-files-input/UploadFiles';
import { EditedMessagePrompt } from './EditedMessagePrompt';
import AudioRecorder from '../audio/AudioRecorder';

const SCREEN_WIDTH = Dimensions.get('screen').width;
const MIN_INPUT_HEIGHT = 48;
const MAX_INPUT_HEIGHT = 350;

type ChatInputProps = {
  openBottomSheet: () => void;
  onSendMessage?: (message: string) => void;
  onStopMessage?: () => void;
  isSending?: boolean;
  uploadedFiles?: UploadedFile[];
  onRemoveFile?: (fileId: string) => void;
};

const ChatInput = ({
  openBottomSheet,
  onSendMessage,
  onStopMessage,
  isSending = false,
  uploadedFiles = [],
  onRemoveFile,
}: ChatInputProps) => {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const dispatch = useDispatch();
  const textInputRef = useRef<TextInput>(null);

  const { message, isRecording } = useSelector((state: RootState) => state.chat);
  const { isEdited } = useSelector((state: RootState) => state.messageOptions);

  const [showEditedPopup, setShowEditedPopup] = useState(false);

  // Shared value for height animation
  const inputHeight = useSharedValue(MIN_INPUT_HEIGHT);

  // Animated style for smooth resizing
  const animatedContainerStyle = useAnimatedStyle(() => ({
    height: withSpring(inputHeight.value, {
      damping: 20,
      stiffness: 200,
    }),
  }));

  // Handle typing
  const handleMessageChange = useCallback(
    (text: string) => {
      dispatch(setMessage(text));
    },
    [dispatch]
  );

  // Adjust height dynamically
  const handleContentSizeChange = useCallback(
    (event: any) => {
      const { height } = event.nativeEvent.contentSize;
      const newHeight = Math.min(Math.max(height, MIN_INPUT_HEIGHT), MAX_INPUT_HEIGHT);
      inputHeight.value = newHeight;
    },
    [inputHeight]
  );

  // Send message
  const handleSendMessage = useCallback(async () => {
    const hasMessage = message.trim();
    const hasFiles = uploadedFiles.length > 0;

    if (!hasMessage && !hasFiles) return;

    try {
      onSendMessage?.(message);
      dispatch(setMessage(''));
      inputHeight.value = MIN_INPUT_HEIGHT;
      if (isEdited) {
        setShowEditedPopup(false);
        dispatch(resetOptions());
      }
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  }, [message, uploadedFiles, onSendMessage, isEdited, dispatch, inputHeight]);

  useEffect(() => {
    if (isEdited) {
      setShowEditedPopup(true);
      dispatch(setMessageOption(message));
    }
  }, [isEdited, dispatch, message]);

  // Recording setup
  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission to access microphone was denied');
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      await audioRecorder.stop();
      dispatch(setIsRecording(false));
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  }, [dispatch, audioRecorder]);

  const transcribeAudio = useCallback(async () => {
    try {
      if (isRecording) await audioRecorder.stop();
      dispatch(setIsRecording(false));
      console.log('Transcription started...');
    } catch (error) {
      console.error('Transcription error:', error);
    }
  }, [dispatch, audioRecorder, isRecording]);

  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      try {
        dispatch(setIsRecording(true));
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
      } catch (error) {
        console.error('Error starting recording:', error);
        dispatch(setIsRecording(false));
      }
    }
  }, [isRecording, dispatch, audioRecorder, stopRecording]);

  const handleStopMessage = useCallback(() => {
    onStopMessage?.();
  }, [onStopMessage]);

  const clearMessage = useCallback(() => {
    dispatch(setMessage(''));
    dispatch(resetOptions());
    inputHeight.value = MIN_INPUT_HEIGHT;
  }, [dispatch, inputHeight]);

  const canSendMessage = (message.trim() || uploadedFiles.length > 0) && !isSending;
  const showStopButton = isSending;

  return (
    <View style={styles.container}>
      <EditedMessagePrompt
        message={message}
        setMessage={handleMessageChange}
        showEditedMessagePopup={showEditedPopup}
        setShowEditedMessagePopup={setShowEditedPopup}
        clearMessage={clearMessage}
      />

      {uploadedFiles.length > 0 && (
        <UploadedFiles files={uploadedFiles} onRemoveFile={onRemoveFile} />
      )}

      <View style={styles.mainInputArea}>
        {isRecording ? (
          <AudioRecorder
            transcribeAudio={transcribeAudio}
            stopRecording={stopRecording}
          />
        ) : (
          <>
            {/* Animated input container */}
            <Animated.View style={[styles.inputContainer, animatedContainerStyle]}>
              <TextInput
                ref={textInputRef}
                style={styles.textInput}
                placeholder="Ask anything"
                placeholderTextColor="#9CA3AF"
                value={message}
                onChangeText={handleMessageChange}
                onContentSizeChange={handleContentSizeChange}
                multiline
                editable={!isSending}
                scrollEnabled = {true}
                textAlignVertical="top"
                returnKeyType="default"
              />
            </Animated.View>

            {/* Icons */}
            <View style={styles.iconsContainer}>
              <TouchableOpacity
                onPress={() => {
                  if (Keyboard.isVisible()) {
                    openBottomSheet();
                    return Keyboard.dismiss();
                  }
                  openBottomSheet();
                }}
                style={[styles.iconButton, { borderWidth: 1, borderColor: Colors.dark.borderColor }]}
              >
                <Feather name="plus" size={20} color="white" />
              </TouchableOpacity>

              <View style={styles.iconContainer}>
                <TouchableOpacity
                  style={[
                    styles.iconButton,
                    isRecording && styles.recordingButton,
                    { borderWidth: isRecording ? 0 : 1, borderColor: Colors.dark.borderColor },
                  ]}
                  onPress={handleMicPress}
                  activeOpacity={0.7}
                  disabled={isSending}
                >
                  <Ionicons
                    name={isRecording ? 'mic' : 'mic-outline'}
                    size={20}
                    color={
                      isRecording ? Colors.dark.bgPrimary : Colors.dark.txtSecondary
                    }
                  />
                </TouchableOpacity>

                {showStopButton ? (
                  <TouchableOpacity
                    style={[styles.iconButton, styles.stopButton]}
                    onPress={handleStopMessage}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="stop" size={17} color={Colors.dark.bgSecondary} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.iconButton,
                      canSendMessage && styles.recordingButton,
                      {
                        borderWidth: canSendMessage ? 0 : 1,
                        borderColor: Colors.dark.borderColor,
                      },
                    ]}
                    onPress={handleSendMessage}
                    activeOpacity={0.7}
                    disabled={!canSendMessage}
                  >
                    <Ionicons
                      name="send"
                      size={17}
                      color={
                        canSendMessage
                          ? Colors.dark.bgPrimary
                          : Colors.dark.txtSecondary
                      }
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        )}
      </View>
    </View>
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
  mainInputArea: {
    paddingHorizontal: 16,
  },
  inputContainer: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textInput: {
    color: '#F9FAFB',
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 0,
    maxHeight: MAX_INPUT_HEIGHT,
    flex: 1,
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
  stopButton: {
    backgroundColor: Colors.dark.txtPrimary,
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default ChatInput;
