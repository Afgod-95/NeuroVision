import { useCallback, Dispatch, SetStateAction } from "react";
import { Message } from "@/src/utils/interfaces/TypescriptInterfaces";

interface UseTypingAnimationProps {
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setIsTyping: Dispatch<SetStateAction<boolean>>;
  typingIntervalRef: React.RefObject<NodeJS.Timeout | number | null>;
  typingTimeoutRef: React.RefObject<NodeJS.Timeout | number | null>;
  currentTypingMessageIdRef: React.RefObject<string | null>;
  scrollToBottom: () => void;
}

// Handles all typing animation logic
export const useTypingAnimation = ({ 
  setMessages, 
  setIsTyping,
  typingIntervalRef,
  typingTimeoutRef,
  currentTypingMessageIdRef,
  scrollToBottom 
}: UseTypingAnimationProps) => {
  
  const cleanupTypingAnimation = useCallback(() => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    currentTypingMessageIdRef.current = null;
    setIsTyping(false);
  }, [setIsTyping, currentTypingMessageIdRef,  typingIntervalRef, typingTimeoutRef]);

  const startTypingAnimation = useCallback((fullText: string, messageId: string) => {
  // Clear any existing typing animation
  if (typingIntervalRef.current) {
    clearInterval(typingIntervalRef.current);
    typingIntervalRef.current = null;
  }
  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
  }
  
  setIsTyping(true);
  currentTypingMessageIdRef.current = messageId;
  let currentIndex = 0;
  const typingSpeed = 10;

  const typeNextCharacter = () => {
    if (currentIndex <= fullText.length && currentTypingMessageIdRef.current === messageId) {
      const currentText = fullText.substring(0, currentIndex);

      setMessages((prev: Message[]) =>
        prev.map((msg: Message) =>
          msg.id === messageId
            ? { ...msg, text: currentText, isTyping: currentIndex < fullText.length }
            : msg
        )
      );

      if (currentIndex < fullText.length) {
        currentIndex++;
        typingIntervalRef.current = setTimeout(typeNextCharacter, typingSpeed);
      } else {
        // Typing animation complete
        currentTypingMessageIdRef.current = null;
        setIsTyping(false);
        setMessages((prev: Message[]) =>
          prev.map((msg: Message) =>
            msg.id === messageId
              ? { ...msg, isTyping: false }
              : msg
          )
        );
      }

      // Call scrollToBottom directly without dependency
      scrollToBottom();
    }
  };

  typeNextCharacter();
}, []);

  return {
    cleanupTypingAnimation,
    startTypingAnimation,
  };
};