import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/Colors';
import Feather from '@expo/vector-icons/Feather';
import { useDispatch, useSelector } from 'react-redux';
import { resetOptions, setMessageId } from '@/src/redux/slices/messageOptionsSlice';
import { setIsRecording, setMessage } from '@/src/redux/slices/chatSlice';
import { EditedMessagePrompt } from './EditedMessagePrompt';
import UploadedFiles, { UploadedFile } from './upload-files/UploadFiles';
import { RootState } from '@/src/redux/store';
import { setMessage as setMessageOption } from '@/src/redux/slices/messageOptionsSlice';
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
  withSpring 
} from 'react-native-reanimated';
import MovingWaveform from '../audio/MovingWave';
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
  
  // Reanimated shared values
  const inputHeight = useSharedValue(MIN_INPUT_HEIGHT);

  const dispatch = useDispatch();
  const textInputRef = useRef<TextInput>(null);

  // Get message from Redux state
  const { message, isRecording } = useSelector((state: RootState) => state.chat);
  const { isEdited, message: editedMessage } = useSelector((state: RootState) => state.messageOptions);

  const [showEditedPopup, setShowEditedPopup] = useState<boolean>(false);

  // Animated styles
  const animatedContainerStyle = useAnimatedStyle(() => ({
    minHeight: inputHeight.value,
  }));

  // Handle text input changes - updates Redux state
  const handleMessageChange = useCallback((text: string) => {
    dispatch(setMessage(text));
  }, [dispatch]);

  // Handle content size change
  const handleContentSizeChange = useCallback((event: any) => {
    const { height } = event.nativeEvent.contentSize;
    const newHeight = Math.min(Math.max(height, MIN_INPUT_HEIGHT), MAX_INPUT_HEIGHT);
    
    inputHeight.value = withSpring(newHeight, {
      damping: 15,
      stiffness: 150,
    });
  }, [inputHeight]);

  const handleSendMessage = useCallback(async () => {
    const hasMessage = message.trim();
    const hasFiles = uploadedFiles.length > 0;

    if (!hasMessage && !hasFiles) return;

    try {
      onSendMessage?.(message);
      // Clear message in Redux state
      dispatch(setMessage(''));

      // Reset input height
      inputHeight.value = withSpring(MIN_INPUT_HEIGHT, {
        damping: 15,
        stiffness: 150,
      });

      // Hide edited message prompt if it was showing
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

  const handleStopMessage = useCallback(() => {
    onStopMessage?.();
  }, [onStopMessage]);

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission to access microphone was denied');
      }

      setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, []);

  // Stop recording function
  const stopRecording = useCallback(async () => {
    try {
      console.log('Stopping recording...');
      await audioRecorder.stop();
      dispatch(setIsRecording(false));
      console.log(`Recording stopped, isRecording set to false \n  Audio URI: ${audioRecorder.uri}`);
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  }, [dispatch, audioRecorder]);

  // Transcribe audio function
  const transcribeAudio = useCallback(async () => {
    try {
      console.log('Starting transcription...');
      
      if (isRecording) {
        await audioRecorder.stop();
      }
      
      dispatch(setIsRecording(false));
      
      // TODO: Add your actual transcription logic here
      console.log('Transcription process initiated');
    } catch (error) {
      console.error('Error during transcription:', error);
      dispatch(setIsRecording(false));
    }
  }, [dispatch, audioRecorder, isRecording]);

  // Handle mic press function
  const handleMicPress = useCallback(async () => {
    console.log('Mic pressed, current isRecording:', isRecording);
    
    if (isRecording) {
      console.log('Stopping current recording...');
      await stopRecording();
    } else {
      console.log('Starting recording...');
      try {
        dispatch(setIsRecording(true));
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        console.log('Recording started successfully');
      } catch (error) {
        console.error('Error starting recording:', error);
        dispatch(setIsRecording(false));
        Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
      }
    }
  }, [isRecording, dispatch, audioRecorder, stopRecording]);

  // Add handler for focusing the input when container is pressed
  const handleInputContainerPress = useCallback(() => {
    if (!isSending && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [isSending]);

  // Clear message function for EditedMessagePrompt
  const clearMessage = useCallback(() => {
    dispatch(setMessage(''));
    dispatch(resetOptions());
    
    // Reset input height
    inputHeight.value = withSpring(MIN_INPUT_HEIGHT, {
      damping: 15,
      stiffness: 150,
    });
  }, [dispatch, inputHeight]);

  const canSendMessage = (message.trim() || uploadedFiles.length > 0) && !isSending;
  const showStopButton = isSending;

  return (
    <>
      <View style={[styles.container]}>
        <EditedMessagePrompt
          message={message}
          setMessage={handleMessageChange}
          showEditedMessagePopup={showEditedPopup}
          setShowEditedMessagePopup={setShowEditedPopup}
          clearMessage={clearMessage}
        />
          
        {/* Uploaded files component */}
        {uploadedFiles && uploadedFiles.length > 0 && (
          <UploadedFiles
            files={uploadedFiles}
            onRemoveFile={onRemoveFile}
          />
        )}

        {/* Main input area */}
        <View style={styles.mainInputArea}>
          {isRecording ? (
            <>
              {/* Show audio recorder when recording */}
              <AudioRecorder
                transcribeAudio={transcribeAudio}
                stopRecording={stopRecording}
              />
            </>
          ) : (
            <>
              {/* Show text input when not recording */}
              <Animated.View style={[styles.inputContainer, animatedContainerStyle]}>
                <TouchableOpacity
                  onPress={handleInputContainerPress}
                  activeOpacity={1}
                  style={{ flex: 1 }}
                >
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
                    scrollEnabled={inputHeight.value >= MAX_INPUT_HEIGHT}
                    textAlignVertical="top"
                    returnKeyType="default"
                  />
                </TouchableOpacity>
              </Animated.View>
              <View style={styles.iconsContainer}>
                <TouchableOpacity
                  onPress={() => {
                    if (Keyboard.isVisible()) {
                        openBottomSheet();
                        return Keyboard.dismiss();
                    }
                    openBottomSheet()
                   
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
                      { borderWidth: isRecording ? 0 : 1, borderColor: Colors.dark.borderColor }
                    ]}
                    onPress={handleMicPress}
                    activeOpacity={0.7}
                    disabled={isSending}
                  >
                    <Ionicons
                      name={isRecording ? "mic" : "mic-outline"}
                      size={20}
                      color={isRecording ? Colors.dark.bgPrimary : Colors.dark.txtSecondary}
                    />
                  </TouchableOpacity>

                  {showStopButton ? (
                    <TouchableOpacity
                      style={[
                        styles.iconButton,
                        styles.stopButton,
                      ]}
                      onPress={handleStopMessage}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="stop"
                        size={17}
                        color={Colors.dark.bgSecondary}
                      />
                    </TouchableOpacity>
                  ) : (
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
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      </View>
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
  waveformContainer: {
    flexDirection: 'row',
    gap: 15,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  mainInputArea: {
    paddingHorizontal: 16,
  },
  inputContainer: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  textInput: {
    color: '#F9FAFB',
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 0,
    maxHeight: 350,
    paddingHorizontal: 0,
    margin: 0,
    minHeight: 45,
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
});

export default ChatInput;