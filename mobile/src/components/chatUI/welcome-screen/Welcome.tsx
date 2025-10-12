import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from "react-native";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/src/constants/Colors";
import { MotiView, MotiText } from "moti";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const messages = [
  "How may I help you today?",
  "Need help finding something?",
  "Want me to summarize the latest news?",
  "Ready to explore new ideas?",
];

const gptPrompts = [
  "Write a short story about a robot and a cat",
  "Summarize the latest tech news",
  "Explain quantum physics in simple terms",
  "Give me dinner ideas for tonight",
  "Create a workout plan for beginners",
  "Help me plan a weekend trip",
  "Write a professional email",
  "Explain how AI works",
];

const welcomePrompts = [
  "What can you help me with?",
  "Tell me about your capabilities",
  "How do you work?",
  "Show me what you can do",
  "Help me get started",
  "What makes you different?",
  "Can you write and create content?",
  "Do you understand context and memory?",
];

const MESSAGE_ROTATION_DAYS = 3;
const { width: screenWidth } = Dimensions.get("window");

interface WelcomeProps {
  username?: string;
  newChat?: boolean;
  onPromptSelect?: (text: string) => void;
  handleSendMessage: (text: string) => void;
}

const Welcome = ({ username, newChat = false, onPromptSelect, handleSendMessage }: WelcomeProps) => {
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [rotatingMessage, setRotatingMessage] = useState(messages[0]);

  useEffect(() => {
    const initWelcome = async () => {
      const seen = await AsyncStorage.getItem("hasSeenWelcome");
      const storedMessageData = await AsyncStorage.getItem("lastMessageData");

      if (seen) {
        setIsFirstTime(false);

        // Only handle message rotation if not a new chat
        if (!newChat) {
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
              "lastMessageData",
              JSON.stringify({ index: nextIndex, date: now })
            );
          } else {
            setRotatingMessage(messages[lastMessageIndex]);
          }
        }
      } else {
        await AsyncStorage.setItem("hasSeenWelcome", "true");
        await AsyncStorage.setItem(
          "lastMessageData",
          JSON.stringify({ index: 0, date: Date.now() })
        );
      }
    };

    initWelcome();
  }, [newChat]);



  const renderPromptItem = ({ item }: { item: string }) => (
    <MotiView
      from={{ scale: 1 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", damping: 12 }}
    >
      <TouchableOpacity
        onPress={() => handleSendMessage(item)}
        activeOpacity={0.9}
        style={styles.promptCard}
      >
        <MotiText
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 150 }}
          style={styles.promptText}
        >
          {item}
        </MotiText>
      </TouchableOpacity>
    </MotiView>

  );

  if (newChat) {
    return (
      <View style={styles.newChatContainer}>
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 15 }}
          style={styles.welcomeContainer}
        >
          <MotiText
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 300 }}
            style={styles.welcomeText}
          >
            💫 Welcome back, {username}!
          </MotiText>
          <MotiText
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 300 }}
            style={styles.subText}
          >
            Choose a prompt to get started
          </MotiText>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", delay: 700 }}
          style={styles.promptsSection}
        >
          <FlatList
            data={gptPrompts}
            renderItem={renderPromptItem}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promptsList}
            snapToInterval={screenWidth * 0.65 + 12}
            decelerationRate="fast"
          />
        </MotiView>
      </View>
    );
  }

  return (
    <View style={styles.contentArea}>
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "spring", damping: 15 }}
        style={styles.welcomeContainer}
      >
        {!isFirstTime ? (
          <>
            <MotiText style={styles.welcomeText}>
              {getGreeting()}, {username}! 👋{"\n"}
              <Text style={styles.boldText}>I&apos;m NeuroVision, your AI assistant.</Text>
            </MotiText>
            <MotiText
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 300 }}
              style={styles.subText}
            >
              Let&apos;s explore what I can do for you!
            </MotiText>

            <MotiView
              from={{ opacity: 0, translateY: 30 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "spring", delay: 600 }}
              style={styles.firstTimePromptsSection}
            >
              <FlatList
                data={welcomePrompts}
                renderItem={renderPromptItem}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.promptsList}
                snapToInterval={screenWidth * 0.65 + 12}
                decelerationRate="fast"
              />
            </MotiView>
          </>
        ) : (
          <>
            <Text
              style={styles.welcomeText}
            >
              {getGreeting()}, {username}! 👋
            </Text>
            <MotiText
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 300 }}
              style={styles.subText}
            >
              {rotatingMessage}
            </MotiText>
          </>
        )}
      </MotiView>
    </View>
  );
};

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  contentArea: { flex: 1, justifyContent: "center", alignItems: "center" },
  newChatContainer: { flex: 1, justifyContent: "space-between", paddingBottom: 100 },
  welcomeContainer: { alignItems: "center", paddingHorizontal: 20, flex: 1, justifyContent: "center" },
  welcomeText: { fontSize: 22, color: Colors.dark.button, textAlign: "center", fontFamily: "Manrope-ExtraBold" },
  boldText: { color: Colors.dark.txtPrimary },
  subText: { fontFamily: "Manrope-Medium", color: Colors.dark.txtSecondary, marginTop: 10, fontSize: 16, textAlign: "center" },
  promptsSection: { position: "absolute", bottom: 0, left: 0, right: 0 },
  promptsList: { paddingHorizontal: 20, paddingVertical: 16 },
  promptCard: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    width: width * 0.65,
    height: 80, // fixed height for consistency
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  promptText: { fontFamily: "Manrope-Medium", fontSize: 14, color: Colors.dark.txtPrimary, lineHeight: 18 },
  firstTimePromptsSection: { position: "absolute", bottom: 0, left: 0, right: 0 },
});

export default Welcome;