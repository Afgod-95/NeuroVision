import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  GestureResponderEvent,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Colors } from '@/src/constants/Colors';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInUp,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import Feather from '@expo/vector-icons/Feather';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';
import { getUsernameInitials } from '@/src/constants/getUsernameInitials';
import { useMessageOptions } from '@/src/hooks/UserMessageOptions';
import { useDispatch } from 'react-redux';
import { setShowOptions } from '@/src/redux/slices/messageOptionsSlice';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type MessagesProps = {
  message: string;
  messageId: string,
  userMessage: boolean;
  copyMessage?: () => void;
  editMessage?: () => void;
};

const UserMessageBox = ({
  message,
  messageId,
  userMessage,
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
  
  return (
    <>

      {/* User message */}
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
          ]}
        >
          <Text style={styles.messageText}>{message}</Text>
        </Pressable>
         {isEdited && (
            <Text style = {styles.editedMessage}>Edited</Text>
          )}

      </Animated.View>


    </>
  );
};


export const MessagePreview = ({
  copyMessage,
  editMessage,
}: MessagesProps) => {
  const dispatch = useDispatch();
  const { showOptions, touchPos, showAbove, message } = useSelector(
    (state: RootState) => state.messageOptions
  );


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
                  <Pressable onPress={copyMessage} style={styles.optionButton}>
                    <Text style={styles.optionText}>Copy</Text>
                  </Pressable>
                  <Pressable onPress={editMessage} style={styles.optionButton}>
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
                  <Pressable onPress={copyMessage} style={styles.optionButton}>
                    <Text style={styles.optionText}>Copy</Text>
                    <Feather name = 'copy' color = {Colors.dark.txtPrimary} size = {20}/>
                  </Pressable>
                  <Pressable onPress={editMessage} style={styles.optionButton}>
                    <Text style={styles.optionText}>Edit</Text>
                     <Feather name = 'edit-2' color = {Colors.dark.txtPrimary} size = {20}/>
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
    paddingVertical: 10,
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
    justifyContent: 'space-between',
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
    marginBottom: 3
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
});

export default UserMessageBox;