import {
  View,
  Text,
  Image,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  LayoutAnimation, UIManager,
  Platform,
  FlatList
} from 'react-native'
import React, { useEffect, useState } from 'react'
import { Colors } from '@/src/constants/Colors'
import ChatInput from '@/src/components/textInputs/ChatInput'
import CustomSideBar from '@/src/components/sidebar/CustomSideBar'
import { useDispatch } from 'react-redux'
import { logout } from '@/src/redux/slices/authSlice'
import { router } from 'expo-router'
import { useSelector } from 'react-redux'
import { RootState } from '@/src/redux/store'
import UserMessageBox, { MessagePreview } from '@/src/components/messages/UserMessageBox';
import AdvancedAIResponse from '@/src/components/messages/AIResponse'
import { useMessageOptions } from '@/src/hooks/UserMessageOptions'

const Index = () => {

  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [messages, setMessages] = useState([
    { id: '1', text: 'Hello, how can I help you?', user: false },
    { id: '2', text: 'Summarize the latest AI trends what jsjsjsjsjsjsjsjssjjsjsjshshshshshshshshshshshshshshshjsjsjssjsjsjsjsjsjsjsjsjsjsjsjjs.', user: true },
  ]);

  const { messageId, isEdited } = useSelector((state: RootState) => state.messageOptions)

  //prefill message if its edited
  useEffect(() => {
    if (isEdited) {
      setMessage(messageId ?? '')
    }
  }, [isEdited, messageId])
  
  const { handleEditMessage } = useMessageOptions();

  if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
  ) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
  }


  const handleMessageOnChange = (text: string) => {
    console.log('handleMessageOnChange');
    setMessage(text)
  }

  const handleIsRecording = (isRecording: boolean) => {
    setIsRecording(isRecording)
  }


  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    })
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    })

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  const { user: userDetaials } = useSelector((state: RootState) => state.user);
  //username 
  const username = userDetaials?.username?.split(" ")[0];


  return (
    <>
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.container}>
          {/* Background Image */}
          <Image
            source={require('@/src/assets/images/CircularGradient.png')}
            style={styles.backgroundImage}
          />

          <KeyboardAvoidingView
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            <SafeAreaView style={styles.safeAreaContainer}>
              {/* Header - Fixed at top */}
              <View style={styles.header}>
                <TouchableOpacity onPress={() => {
                  setIsSidebarVisible(true)
                }}>
                  <Image
                    source={require('@/src/assets/images/menu.png')}
                    style={styles.menuIcon}
                  />
                </TouchableOpacity>


                <Text style={styles.headerTitle}>NeuroVision</Text>
                <View style={{ width: 30, height: 30 }} />
              </View>

              {/* Content Area - Will be replaced by FlatList when conversation starts */}
              {messages.length === 0 ? (
                <View style={styles.contentArea}>
                  <View style={styles.welcomeContainer}>
                    <Text style={styles.welcomeText}>
                      Hello {username} 👋{'\n'}
                      <Text style={styles.boldText}>I&apos;m NeuroVision, your AI assistant.</Text>
                    </Text>
                    <Text style={styles.subText}>
                      How may I help you today?
                    </Text>
                  </View>
                </View>
              ) : (
                <FlatList
                  data={messages}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                  renderItem={({ item }) =>
                    item.user ? (
                      <UserMessageBox 
                        message={item.text} 
                        messageId= {item.id}
                        userMessage={true}
                      />
                    ) : (
                      <AdvancedAIResponse message={item.text}
                        loading = { false }
                      />
                    )
                  }
                />
              )}
            </SafeAreaView>

            {/* USER MESSAGE PREVIEW */}
            <MessagePreview 
              message={messageId ?? ''}
              userMessage={true}
              editMessage={() => handleEditMessage(message) }
            />
            {/* chat input */}
            <ChatInput 
              message = {message}
              setMessage = {handleMessageOnChange}
              isRecording = {isRecording}
              setIsRecording = {handleIsRecording}
              isEdited = {isEdited}
            />
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>

      {/* Sidebar */}
      <CustomSideBar
        isVisible={isSidebarVisible}
        onClose={() => setIsSidebarVisible(false)}
        onOpen={() => setIsSidebarVisible(true)}
      />
    </>


  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bgPrimary,
  },
  backgroundImage: {
    position: 'absolute',
    top: -150,
    right: -170,
    width: 500,
    height: 500,
    zIndex: -1,
  },
  keyboardContainer: {
    flex: 1,
  },
  safeAreaContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 60,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  menuIcon: {
    width: 30,
    height: 30,
  },
  headerTitle: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 28,
    color: Colors.dark.txtPrimary,
  },
  welcomeText: {
    fontSize: 24,
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
  },
})

export default Index