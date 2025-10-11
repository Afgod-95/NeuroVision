import React from 'react';
import {
  Platform,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  View
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/Colors';
import Animated from 'react-native-reanimated';

interface AuthWrapperProps {
  children: React.ReactNode;
  safeArea?: boolean;
}

const ScreenWrapper = ({ children, safeArea = true }: AuthWrapperProps) => {
  const Container = safeArea ? SafeAreaView : View;

  if (Platform.OS === 'android') {
    return (
      <Container style={[styles.container, { backgroundColor: Colors.dark.bgPrimary }]}>
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => Keyboard.dismiss()}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View style={styles.contentWrapper}>
            {children}
          </Animated.View>
        </Animated.ScrollView>
        
        <Image
          source={require('../../assets/images/CircularGradient.png')}
          style={styles.image}
        />
      </Container>
    );
  }

  // iOS layout with KeyboardAvoidingView
  return (
    <Container style={[styles.container, { backgroundColor: Colors.dark.bgPrimary }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => Keyboard.dismiss()}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View style={styles.contentWrapper}>
            {children}
          </Animated.View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
        
      <Image
        source={require('../../assets/images/CircularGradient.png')}
        style={styles.image}
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  contentWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
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