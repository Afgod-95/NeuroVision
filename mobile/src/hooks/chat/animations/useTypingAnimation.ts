import { useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { updateMessage, setIsAIResponding } from "@/src/redux/slices/chatSlice";
import { AppDispatch } from "@/src/redux/store";

type UseTypingAnimationProps = {
  isProcessingResponseRef: React.RefObject<boolean>;
  currentLoadingIdRef: React.RefObject<string | null>;
  typingIntervalRef: React.RefObject<NodeJS.Timeout | number | null>;
};

export const useTypingAnimation = ({
  isProcessingResponseRef,
  currentLoadingIdRef,
  typingIntervalRef
}: UseTypingAnimationProps) => {
  const dispatch = useDispatch<AppDispatch>();
  
  const currentTextRef = useRef<string>("");
  const targetTextRef = useRef<string>("");
  const currentIndexRef = useRef<number>(0);
  const currentMessageIdRef = useRef<string | null>(null);

  const cleanupTypingAnimation = useCallback(() => {
    console.log("🧹 Cleanup: typingIntervalRef.current:", typingIntervalRef.current);
    
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current as any);
      typingIntervalRef.current = null;
      console.log("✅ Cleared interval");
    }
    
    if (currentMessageIdRef.current && targetTextRef.current) {
      console.log("📝 Finalizing message:", currentMessageIdRef.current);
      dispatch(updateMessage({
        id: currentMessageIdRef.current,
        updates: {
          text: targetTextRef.current,
          isTyping: false,
          isLoading: false,
        }
      }));
    }
    
    currentTextRef.current = "";
    targetTextRef.current = "";
    currentIndexRef.current = 0;
    currentMessageIdRef.current = null;
    
    dispatch(setIsAIResponding(false));
    isProcessingResponseRef.current = false;
    console.log("🧹 Cleanup complete");
  }, [dispatch, isProcessingResponseRef, typingIntervalRef]);

  const startTypingAnimation = useCallback((
    fullText: string, 
    messageId: string,
    speed: number = 20
  ) => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎬 START TYPING ANIMATION");
    console.log("  Message ID:", messageId);
    console.log("  Text length:", fullText.length);
    console.log("  Speed:", speed);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    cleanupTypingAnimation();

    targetTextRef.current = fullText;
    currentMessageIdRef.current = messageId;
    currentIndexRef.current = 0;
    currentTextRef.current = "";

    // Short message path
    if (fullText.length < 50) {
      console.log("📄 Short message - showing immediately");
      dispatch(updateMessage({
        id: messageId,
        updates: {
          text: fullText,
          isTyping: false,
          isLoading: false,
        }
      }));
      
      setTimeout(() => {
        dispatch(setIsAIResponding(false));
        isProcessingResponseRef.current = false;
        console.log("✅ Short message complete");
      }, 100);
      
      return;
    }

    // Long message - start interval
    console.log("⏳ Creating interval for long message...");
    
    const intervalId = setInterval(() => {
      const remainingChars = fullText.length - currentIndexRef.current;
      
      console.log(`⌨️ Typing: ${currentIndexRef.current}/${fullText.length} (${remainingChars} remaining)`);
      
      if (remainingChars <= 0) {
        console.log("🏁 Animation complete - finalizing");
        
        dispatch(updateMessage({
          id: messageId,
          updates: {
            text: fullText,
            isTyping: false,
            isLoading: false,
          }
        }));
        
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current as any);
          typingIntervalRef.current = null;
        }
        
        currentTextRef.current = "";
        targetTextRef.current = "";
        currentIndexRef.current = 0;
        currentMessageIdRef.current = null;
        
        dispatch(setIsAIResponding(false));
        isProcessingResponseRef.current = false;
        
        console.log("✅ Typing animation finished");
        return;
      }

      const chunkSize = Math.min(speed, remainingChars);
      currentIndexRef.current += chunkSize;
      currentTextRef.current = fullText.substring(0, currentIndexRef.current);

      console.log(`  Dispatching update: ${currentTextRef.current.length} chars`);
      
      dispatch(updateMessage({
        id: messageId,
        updates: {
          text: currentTextRef.current,
          isTyping: true,
          isLoading: false,
        }
      }));

    }, 50);
    
    typingIntervalRef.current = intervalId as any;
    console.log("✅ Interval created:", typingIntervalRef.current);

  }, [dispatch, cleanupTypingAnimation, isProcessingResponseRef, typingIntervalRef]);

  const skipTypingAnimation = useCallback(() => {
    if (currentMessageIdRef.current && targetTextRef.current) {
      console.log("⏭️ Skipping to end of typing animation");
      
      dispatch(updateMessage({
        id: currentMessageIdRef.current,
        updates: {
          text: targetTextRef.current,
          isTyping: false,
          isLoading: false,
        }
      }));
      
      cleanupTypingAnimation();
    }
  }, [dispatch, cleanupTypingAnimation]);

  return {
    startTypingAnimation,
    cleanupTypingAnimation,
    skipTypingAnimation,
  };
};