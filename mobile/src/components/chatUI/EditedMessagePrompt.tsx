
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { resetOptions } from '@/src/redux/slices/messageOptionsSlice';
import { RootState } from '@/src/redux/store';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutUp,
} from 'react-native-reanimated'
import Feather from '@expo/vector-icons/Feather';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Colors } from '@/src/constants/Colors';    

const SCREEN_WIDTH = Dimensions.get('screen').width;


interface EditedMessagePromptProps {
    message: string;
    setMessage: (msg: string) => void;
}

type ClearMessage = () => void;

export const EditedMessagePrompt: React.FC<EditedMessagePromptProps & { clearMessage: ClearMessage }> = (
    { message, setMessage, clearMessage }
) => {
    const { isEdited } = useSelector((state: RootState) => state.messageOptions);
    const dispatch = useDispatch();

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
