import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/Colors';
import Feather from '@expo/vector-icons/Feather';
import { useDispatch, useSelector } from 'react-redux';
import { resetOptions } from '@/src/redux/slices/messageOptionsSlice';
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
import MovingWaveform from '../audio/MovingWave';
import AudioRecorder from '../audio/AudioRecorder';

const SCREEN_WIDTH = Dimensions.get('screen').width;

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

  // Get message from Redux state
  const { message, isRecording } = useSelector((state: RootState) => state.chat);
  const { isEdited } = useSelector((state: RootState) => state.messageOptions);

  const [showEditedPopup, setShowEditedPopup] = useState<boolean>(false);

  // Handle text input changes - updates Redux state
  const handleMessageChange = useCallback((text: string) => {
    dispatch(setMessage(text));
  }, [dispatch]);

  const handleSendMessage = useCallback(async () => {
    const hasMessage = message.trim();
    const hasFiles = uploadedFiles.length > 0;

    if (!hasMessage && !hasFiles) return;

    try {
      onSendMessage?.(message);
      // Clear message in Redux state
      dispatch(setMessage(''));

      // Hide edited message prompt if it was showing
      if (isEdited) {
        setShowEditedPopup(false);
        dispatch(resetOptions());
      }
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  }, [message, uploadedFiles, onSendMessage, isEdited, dispatch]);

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

  // top recording function
  const stopRecording = useCallback(async () => {
    try {
      console.log('Stopping recording...');
      await audioRecorder.stop();
      // Set to false to stop recording state
      dispatch(setIsRecording(false));

      console.log(`Recording stopped, isRecording set to false \n  Audio URI: ${audioRecorder.uri}`);
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  }, [dispatch, audioRecorder]);

  //Transcribe audio function
  const transcribeAudio = useCallback(async () => {
    try {
      console.log('Starting transcription...');
      
      // First, stop recording if it's still active
      if (isRecording) {
        await audioRecorder.stop();
      }
      
      // Set recording state to false
      dispatch(setIsRecording(false));
      
      // TODO: Add your actual transcription logic here
      // const recordingUri = audioRecorder.uri;
      // const transcriptionResult = await transcribeAudioFile(recordingUri);
      // dispatch(setMessage(transcriptionResult));
      
      console.log('Transcription process initiated');
    } catch (error) {
      console.error('Error during transcription:', error);
      dispatch(setIsRecording(false));
    }
  }, [dispatch, audioRecorder, isRecording]);

  // FIXED: Handle mic press function
  const handleMicPress = useCallback(async () => {
    console.log('Mic pressed, current isRecording:', isRecording);
    
    if (isRecording) {
      // If currently recording, stop it
      console.log('Stopping current recording...');
      await stopRecording();
    } else {
      // If not recording, start recording
      console.log('Starting recording...');
      try {
        // Set recording state to true first
        dispatch(setIsRecording(true));
        // Prepare and start recording
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        console.log('Recording started successfully');
      } catch (error) {
        console.error('Error starting recording:', error);
        // Reset recording state on error
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
  }, [dispatch]);

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
        <UploadedFiles
          files={uploadedFiles}
          onRemoveFile={onRemoveFile}
        />

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
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={handleInputContainerPress}
                activeOpacity={1}
              >
                <TextInput
                  ref={textInputRef}
                  style={styles.textInput}
                  placeholder="Ask anything"
                  placeholderTextColor="#9CA3AF"
                  value={message}
                  onChangeText={handleMessageChange}
                  multiline
                  editable={!isSending}
                  scrollEnabled={true}
                  textAlignVertical="top"
                  returnKeyType="default"
                />
              </TouchableOpacity>
              <View style={styles.iconsContainer}>
                <TouchableOpacity
                  onPress={openBottomSheet}
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
    minHeight: 48,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textInput: {
    flex: 1,
    color: '#F9FAFB',
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 150,
    minHeight: 40,
    paddingBottom: 10,
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
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