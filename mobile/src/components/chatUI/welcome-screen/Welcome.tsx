import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/src/constants/Colors';

const messages = [
  "How may I help you today?",
  "Need help finding something?",
  "Want me to summarize the latest news?",
  "Ready to explore new ideas?"
];

const gptPrompts = [
  "Write a short story about a robot and a cat",
  "Summarize the latest tech news",
  "Explain quantum physics in simple terms",
  "Give me dinner ideas for tonight",
  "Create a workout plan for beginners",
  "Help me plan a weekend trip",
  "Write a professional email",
  "Explain how AI works"
];

const welcomePrompts = [
  "What can you help me with?",
  "Tell me about your capabilities",
  "How do you work?",
  "Show me what you can do",
  "Help me get started",
  "What makes you different?",
  "Can you write and create content?",
  "Do you understand context and memory?"
];

const MESSAGE_ROTATION_DAYS = 3;
const { width: screenWidth } = Dimensions.get('window');

interface WelcomeProps {
  username?: string;
  newChat?: boolean;
  onPromptSelect?: (text: string) => void; 
}

const Welcome = ({ username, newChat = false, onPromptSelect }: WelcomeProps) => {
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [rotatingMessage, setRotatingMessage] = useState(messages[0]);

  useEffect(() => {
    if (newChat) return; // skip welcome logic in new chat mode

    const initWelcome = async () => {
      const seen = await AsyncStorage.getItem('hasSeenWelcome');
      const storedMessageData = await AsyncStorage.getItem('lastMessageData');

      if (seen) {
        setIsFirstTime(false);

        let lastMessageIndex = 0;
        let lastDate = 0;

        if (storedMessageData) {
          const parsed = JSON.parse(storedMessageData);
          lastMessageIndex = parsed.index;
          lastDate = parsed.date;
        }

        const now = Date.now();
        const daysPassed = (now - lastDate) / (1000 * 60 * 60 * 24);

        if (daysPassed >= MESSAGE_ROTATION_DAYS) {
          const nextIndex = (lastMessageIndex + 1) % messages.length;
          setRotatingMessage(messages[nextIndex]);
          await AsyncStorage.setItem(
            'lastMessageData',
            JSON.stringify({ index: nextIndex, date: now })
          );
        } else {
          setRotatingMessage(messages[lastMessageIndex]);
        }
      } else {
        await AsyncStorage.setItem('hasSeenWelcome', 'true');
        await AsyncStorage.setItem(
          'lastMessageData',
          JSON.stringify({ index: 0, date: Date.now() })
        );
      }
    };

    initWelcome();
  }, [newChat]);

  const renderPromptItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.promptCard}
      onPress={() => onPromptSelect?.(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.promptText} numberOfLines={3}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  if (newChat) {
    return (
      <View style={styles.newChatContainer}>
        {/* Welcome Text */}
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Hello {username} 👋</Text>
          <Text style={styles.subText}>Choose a prompt to get started</Text>
        </View>

        {/* GPT-style Prompts */}
        <View style={styles.promptsSection}>
          <FlatList
            data={gptPrompts}
            renderItem={renderPromptItem}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promptsList}
            snapToInterval={screenWidth * 0.65 + 12} // Card width + margin
            snapToAlignment="start"
            decelerationRate="fast"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.contentArea}>
      <View style={styles.welcomeContainer}>
        {isFirstTime ? (
          <View style={styles.firstTimeContainer}>
            {/* Welcome Text */}
            <View style={styles.firstTimeWelcome}>
              <Text style={styles.welcomeText}>
                Hello {username} 👋{'\n'}
                <Text style={styles.boldText}>I&apos;m NeuroVision, your AI assistant.</Text>
              </Text>
              <Text style={styles.subText}>Let&apos;s explore what I can do for you!</Text>
            </View>

            {/* Welcome Prompts for First Time Users */}
            <View style={styles.firstTimePromptsSection}>
              <FlatList
                data={welcomePrompts}
                renderItem={renderPromptItem}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.promptsList}
                snapToInterval={screenWidth * 0.65 + 12} // Card width + margin
                snapToAlignment="start"
                decelerationRate="fast"
              />
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.welcomeText}>Hello {username} 👋</Text>
            <Text style={styles.subText}>{rotatingMessage}</Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 100, // Space for input area
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    flex: 1,
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 20,
    color: Colors.dark.button,
    textAlign: 'center',
    fontFamily: 'Manrope-ExtraBold',
  },
  boldText: {
    color: Colors.dark.txtPrimary,
  },
  subText: {
    fontFamily: 'Manrope-Medium',
    color: Colors.dark.txtSecondary,
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  promptsSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  promptsList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  promptCard: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: screenWidth * 0.65, // 65% of screen width
    maxHeight: 80,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  promptText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    color: Colors.dark.txtPrimary,
    lineHeight: 18,
  },

  firstTimeContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 100,
  },
  firstTimeWelcome: {
    alignItems: 'center',
    paddingHorizontal: 20,
    flex: 1,
    justifyContent: 'center',
  },
  firstTimePromptsSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
});

export default Welcome;