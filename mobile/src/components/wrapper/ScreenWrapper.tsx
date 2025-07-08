import {
  Platform,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  View
} from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/Colors';
import Animated from 'react-native-reanimated';

interface AuthWrapperProps {
  children: React.ReactNode;
  safeArea?: boolean;
}

const ScreenWrapper = ({ children, safeArea = true }: AuthWrapperProps) => {
  const Container = safeArea ? SafeAreaView : View;

  return (
    <Container style={[styles.container, { backgroundColor: Colors.dark.bgPrimary }]}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => Keyboard.dismiss()}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, width: '100%' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Animated.View>{children}</Animated.View>
        </KeyboardAvoidingView>
      </Animated.ScrollView>
        
      <Image
        source={require('../../assets/images/CircularGradient.png')}
        style={styles.image}
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    position: 'absolute',
    zIndex: -1,
    bottom: -180,
    left: -150,
    width: 500,
    height: 500,
  },
});

export default ScreenWrapper;
