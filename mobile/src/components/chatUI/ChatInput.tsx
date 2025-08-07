import React, { useCallback } from 'react';
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
import { useDispatch } from 'react-redux';
import { resetOptions } from '@/src/redux/slices/messageOptionsSlice';
import { EditedMessagePrompt } from './EditedMessagePrompt';
import UploadedFiles, { UploadedFile } from './uploaded-files/UploadedFiles';
import { sampleUploadedFile } from '@/src/utils/data';

const SCREEN_WIDTH = Dimensions.get('screen').width;


type ChatInputProps = {
  message: string;
  isEdited: boolean;
  openBottomSheet: () => void;
  setMessage: (message: string) => void;
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
  onSendMessage?: (message: string) => void;
  onStopMessage?: () => void;
  isSending?: boolean;
  uploadedFiles?: UploadedFile[];
  onRemoveFile?: (fileId: string) => void;
};

const ChatInput = ({
  message,
  setMessage,
  openBottomSheet,
  isEdited,
  isRecording,
  setIsRecording,
  onSendMessage,
  onStopMessage,
  isSending = false,
  uploadedFiles = [],
  onRemoveFile,
}: ChatInputProps) => {
  const dispatch = useDispatch();

  const handleSendMessage = useCallback(async () => {
    const hasMessage = message.trim();
    const hasFiles = uploadedFiles.length > 0;
    
    if (!hasMessage && !hasFiles) return;

    try {
      onSendMessage?.(message);
      setMessage('');
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  }, [message, uploadedFiles, onSendMessage, setMessage]);

  const handleStopMessage = useCallback(() => {
    onStopMessage?.();
  }, [onStopMessage]);

  const handleMicPress = useCallback(() => {
    setIsRecording(!isRecording);
    console.log('Microphone pressed, recording:', !isRecording);
  }, [isRecording, setIsRecording]);

  const canSendMessage = (message.trim() || uploadedFiles.length > 0) && !isSending;
  const showStopButton = isSending;

  return (
    <>
      <View style={styles.container}>
        <EditedMessagePrompt 
          message={message}
          setMessage={setMessage}
          clearMessage={() => {
            setMessage('');
            dispatch(resetOptions());
          }}
        />

        {/* Uploaded files component */}
        <UploadedFiles
          files={uploadedFiles}
          onRemoveFile={onRemoveFile}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask anything"
            placeholderTextColor="#9CA3AF"
            value={message}
            onChangeText={setMessage}
            multiline
            editable={!isSending}
          />
        </View>

        <View style={styles.iconsContainer}>
          <TouchableOpacity 
            onPress={openBottomSheet}
            style={[styles.iconButton, { borderWidth: 1, borderColor: Colors.dark.borderColor}]}
          >
            <Feather name="plus" size={20} color="white"/>
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
  stopButton: {
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
});

export default ChatInput;