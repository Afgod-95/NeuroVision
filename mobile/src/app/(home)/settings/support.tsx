import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ContactSupportScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Success', 
        'Your message has been sent to our support team',
        [
          { text: 'OK', onPress: () => {
            setName('');
            setEmail('');
            setSubject('');
            setMessage('');
          }}
        ]
      );
    }, 1500);
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Ionicons name="help-circle" size={32} color="#0066cc" />
        <Text style={styles.headerText}>Contact Support</Text>
      </View>

      <Text style={styles.description}>
        Have questions or need assistance? Fill out the form below and our team will get back to you within 24 hours.
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Subject</Text>
        <TextInput
          style={styles.input}
          placeholder="What's this about?"
          value={subject}
          onChangeText={setSubject}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.messageInput]}
          placeholder="Describe your issue in detail..."
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Text style={styles.submitButtonText}>Sending...</Text>
        ) : (
          <>
            <Ionicons name="paper-plane" size={18} color="white" />
            <Text style={styles.submitButtonText}>Send Message</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.alternateOptions}>
        <Text style={styles.alternateOptionsText}>Or contact us directly:</Text>
        
        <TouchableOpacity 
          style={styles.contactOption}
          onPress={() => Linking.openURL('mailto:support@yourapp.com')}
        >
          <Ionicons name="mail" size={20} color="#0066cc" />
          <Text style={styles.contactOptionText}>support@yourapp.com</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.contactOption}
          onPress={() => Linking.openURL('tel:+1234567890')}
        >
          <Ionicons name="call" size={20} color="#0066cc" />
          <Text style={styles.contactOptionText}>+1 (234) 567-890</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  description: {
    fontSize: 15,
    color: '#666',
    marginBottom: 25,
    lineHeight: 22,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
    color: '#444',
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
  },
  messageInput: {
    height: 120,
    paddingTop: 14,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#0066cc',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 10,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  alternateOptions: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 20,
  },
  alternateOptionsText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f9ff',
    marginBottom: 12,
  },
  contactOptionText: {
    marginLeft: 10,
    color: '#0066cc',
    fontSize: 15,
  },
});

export default ContactSupportScreen;