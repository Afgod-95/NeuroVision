// src/hooks/useMessageOptions.ts
import { GestureResponderEvent, Dimensions } from 'react-native';
import { useDispatch } from 'react-redux';
import {
  setShowOptions,
  setTouchPos,
  setShowAbove,
  setMessage,
  setMessageId,
  setIsEdited
} from '@/src/redux/slices/messageOptionsSlice';
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const useMessageOptions = () => {
  const dispatch = useDispatch();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 10, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 150 });
  };

  const handleLongPress = (event: GestureResponderEvent, message: string) => {
    const { pageX, pageY } = event.nativeEvent;

    const isNearBottom = pageY > SCREEN_HEIGHT - 250;
    const isNearTop = pageY < 150;

    let safeY = pageY;
    if (isNearTop) safeY = 150;
    else if (isNearBottom) safeY = SCREEN_HEIGHT - 250;

    const POPUP_WIDTH = 280;
    const HORIZONTAL_PADDING = 20;

    let safeX = pageX;
    safeX = Math.max(
      HORIZONTAL_PADDING,
      Math.min(pageX - POPUP_WIDTH / 2, SCREEN_WIDTH - POPUP_WIDTH - HORIZONTAL_PADDING)
    );

    dispatch(setTouchPos({ x: safeX, y: safeY }));
    dispatch(setShowAbove(isNearBottom));
    dispatch(setMessage(message));
    dispatch(setShowOptions(true));
    dispatch(setMessageId(message))
  };

  //handleEdit message 
  const handleEditMessage = (message: string) => {
    dispatch(setShowOptions(false));
    dispatch(setIsEdited(true));
    dispatch(setMessage(message));
  }

  return {
    animatedStyle,
    handlePressIn,
    handlePressOut,
    handleLongPress,
    handleEditMessage,
  };
};
