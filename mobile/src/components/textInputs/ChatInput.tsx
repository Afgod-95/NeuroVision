import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/Colors';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';
import Feather from '@expo/vector-icons/Feather';
import AntDesign from '@expo/vector-icons/AntDesign';
import Animated, { FadeIn, FadeInUp, FadeOut, FadeOutUp } from 'react-native-reanimated'
import { useDispatch } from 'react-redux';
import { resetOptions } from '@/src/redux/slices/messageOptionsSlice';


const SCREEN_WIDTH = Dimensions.get('screen').width;

type ChatInputProps = {
  message: string;
  isEdited: boolean,
  setMessage: (message: string) => void;
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
};







const ChatInput = ({
  message,
  setMessage,
  isEdited,
  isRecording,
  setIsRecording
}: ChatInputProps
) => {
  
  const handleSend = () => {
    if (message.trim()) {
      console.log('Sending message:', message);
      setMessage('');
    }
  };

  const EditedMessagePrompt = () => {
    const { isEdited } = useSelector((state: RootState) => state.messageOptions);
    const dispatch = useDispatch();
    const clearMessage = () => {
      dispatch(resetOptions());
      setMessage('');
    }
    return (
      <>
        <Animated.View
          style={styles.searchContainer}
          exiting={FadeOutUp.delay(1).duration(10)}
          entering={FadeInUp}
        >
          <View style = {{ flexDirection: 'row', alignItems: 'center', gap: 5}}>
              <View style={styles.searchIcon}>
            <Feather name="edit-2" size={20} color={Colors.dark.txtSecondary} />
          </View>
          <Text style = {styles.text}>Editing Message</Text>
          </View>
          
          {message.length > 0 && (
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
            >
              <TouchableOpacity onPress={clearMessage}
                style={[
                  styles.searchIcon,
                  {
                    marginLeft: 10,
                    marginRight: 0
                  }
                ]}
              >
                <AntDesign name="closecircle" size={20} color={Colors.dark.txtSecondary} />
              </TouchableOpacity>
            </Animated.View>

          )}
        </Animated.View>
      </>
    )

  }



  const handleMicPress = () => {
    setIsRecording(!isRecording);
    console.log('Microphone pressed');
  };

  return (
    <View style={styles.container}>
       {isEdited && (
          <EditedMessagePrompt />
        )}
      <View style={styles.inputContainer}>
       
        <TextInput
          style={styles.textInput}
          placeholder="Ask anything"
          placeholderTextColor="#9CA3AF"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
        />

        <View style={styles.iconContainer}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              isRecording && styles.recordingButton,
              { borderWidth: isRecording ? 0 : 1, borderColor: Colors.dark.borderColor }
            ]}
            onPress={handleMicPress}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isRecording ? "mic" : "mic-outline"}
              size={20}
              color={isRecording ? Colors.dark.bgPrimary : Colors.dark.txtSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, message.trim() && styles.recordingButton,
            { borderWidth: message.trim() ? 0 : 1, borderColor: Colors.dark.borderColor }
            ]}
            onPress={handleSend}
            activeOpacity={0.7}
            disabled={!message.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={message.trim() ? Colors.dark.bgPrimary : Colors.dark.txtSecondary}
            />
          </TouchableOpacity>
        </View>
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

  searchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: Colors.dark.bgPrimary,
        borderTopRightRadius:  20,
        borderTopLeftRadius:  20,
        paddingHorizontal: 12,
        width: SCREEN_WIDTH - 20,
        height: 40,
    },
    searchInput: {
        flex: 1,
        color: Colors.dark.bgSecondary,
        fontSize: 16,
        fontFamily: 'Manrope-Regular',
    },
    searchIcon: {
        marginRight: 10,
    },
    cancel: {
        color: Colors.dark.txtSecondary,
        fontSize: 14,
    },
    text: {
      color: Colors.dark.txtSecondary,
      fontSize: 14,
      fontWeight: 'bold'
    }
});

export default ChatInput;