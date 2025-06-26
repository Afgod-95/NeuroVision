import { useEffect, useRef, useState } from "react";

// Custom hook for typing animation
export const UseTypingAnimation = (text: string,  speed: number = 30) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {

    if (!text) {
      setDisplayText('');
      setIsTyping(false);
      return;
    }

    // Start typing animation
    setIsTyping(true);
    indexRef.current = 0;
    setDisplayText('');

    intervalRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        setIsTyping(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text, speed]);

  return { displayText, isTyping, intervalRef, setDisplayText, setIsTyping };
};