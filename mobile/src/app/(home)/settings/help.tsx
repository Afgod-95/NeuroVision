import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HelpAndFAQs = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const faqs = [
    {
      id: 'account',
      question: 'Account & Login Issues',
      answer: 'If you\'re having trouble logging in, try resetting your password. For account recovery, contact support with your registered email.',
    },
    {
      id: 'features',
      question: 'How to use app features?',
      answer: 'All features are accessible from the main dashboard. Tap on any feature icon to learn more about its functionality.',
    },
    {
      id: 'privacy',
      question: 'Data Privacy Concerns',
      answer: 'We take your privacy seriously. All data is encrypted and never shared with third parties without consent.',
    },
    {
      id: 'payments',
      question: 'Payment & Subscription',
      answer: 'Manage subscriptions in your account settings. For refunds, contact us within 14 days of purchase.',
    },
    {
      id: 'technical',
      question: 'Technical Support',
      answer: 'Ensure you have the latest app version installed. If issues persist, describe your problem to our support team.',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Help Center</Text>
      
      {/* Contact Support Button */}
      <TouchableOpacity 
        style={styles.supportButton}
        onPress={() => Linking.openURL('mailto:support@example.com')}
      >
        <Ionicons name="mail" size={20} color="white" />
        <Text style={styles.supportButtonText}>Contact Support</Text>
      </TouchableOpacity>

      {/* FAQs Section */}
      <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
      
      {faqs.map((faq) => (
        <View key={faq.id} style={styles.faqItem}>
          <TouchableOpacity 
            style={styles.questionContainer}
            onPress={() => toggleSection(faq.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.question}>{faq.question}</Text>
            <Ionicons 
              name={expandedSections[faq.id] ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color="#666" 
            />
          </TouchableOpacity>
          
          {expandedSections[faq.id] && (
            <View style={styles.answerContainer}>
              <Text style={styles.answer}>{faq.answer}</Text>
            </View>
          )}
        </View>
      ))}

      {/* Additional Help Resources */}
      <Text style={styles.sectionTitle}>Resources</Text>
      <View style={styles.resourcesContainer}>
        <TouchableOpacity 
          style={styles.resourceButton}
          onPress={() => Linking.openURL('https://example.com/privacy')}
        >
          <Text style={styles.resourceText}>Privacy Policy</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.resourceButton}
          onPress={() => Linking.openURL('https://example.com/terms')}
        >
          <Text style={styles.resourceText}>Terms of Service</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#333',
  },
  supportButton: {
    flexDirection: 'row',
    backgroundColor: '#0066cc',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 10,
  },
  supportButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#444',
  },
  faqItem: {
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  questionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  question: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  answerContainer: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  answer: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  resourcesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 30,
  },
  resourceButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  resourceText: {
    color: '#0066cc',
    fontWeight: '500',
  },
});

export default HelpAndFAQs;