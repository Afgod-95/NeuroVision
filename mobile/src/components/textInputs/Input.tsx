import React, { useState, useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/Colors';
import Animated, { FadeInUp } from 'react-native-reanimated';



interface TextInputProps {
  value: string;
  label: string;
  placeholder?: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  blurOnSubmit?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

const AnimatedTextInput: React.FC<TextInputProps> = ({
  label,
  value,
  placeholder = '',
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  blurOnSubmit,
  onFocus,
  onBlur,
}) => {

  const [isFocused, setIsFocused] = useState(false);
  const [hidePassword, setHidePassword] = useState(secureTextEntry);
   const inputRef = useRef<TextInput>(null);

  const isLabelFocused = isFocused || !!value;

  return (
    <Animated.View
     entering={FadeInUp.duration(600).delay(150).springify()}
      style={[
        styles.container,
        { backgroundColor: Colors.dark.bgSecondary, borderRadius: 10 },
      ]}
    >
      {/* Animated Label */}
      <Animatable.Text
        transition={['top', 'color']}
        duration={300}
        style={[
          styles.label,
          isLabelFocused ? styles.labelFocused : styles.labelDefault,
          { color: Colors.dark.txtSecondary},
          { fontSize: isLabelFocused ? 12 : 16, backgroundColor: isFocused ? Colors.dark.bgPrimary : 'transparent' },
          {padding: isFocused ? 2 : 0},
        ]}
      >
        {label}
      </Animatable.Text>

      {/* Input Field */}
      <View style={styles.inputContainer}
       
      >
        <TextInput
          value={value}
          ref = {inputRef}
          onChangeText={onChangeText}
          autoCapitalize='none'
          focusable = {true}
          secureTextEntry={hidePassword}
          keyboardType={keyboardType}
          style={[styles.input, { color: Colors.dark.txtPrimary}]}
          onFocus={() => {
            setIsFocused(true);
            onFocus && onFocus();
          }}
          onBlur={() => {
            if (!value) setIsFocused(false);
            onBlur && onBlur();
          }}
          placeholder={isFocused && !value ? placeholder : ''}
          placeholderTextColor={Colors.dark.txtSecondary}
        />

        {/* Password Eye Icon */}
        {secureTextEntry && isFocused && (
          <TouchableOpacity onPress={() => setHidePassword(!hidePassword)} style={styles.eyeIcon}>
            <Ionicons name={hidePassword ? 'eye-off' : 'eye'} size={20} color={Colors.dark.txtSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  
  label: {
    position: 'absolute',
    left: 12,
    paddingHorizontal: 5,
  },
  labelDefault: {
    top: 15,
    fontSize: 16,
  },
  labelFocused: {
    top: -8,
    fontSize: 12,
    color: '#6200ea',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 40,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 10,
  },
});

export default AnimatedTextInput;