import { useCallback } from "react";
import { QueryClient, UseMutationResult } from "@tanstack/react-query";
import { Message } from "@/src/utils/interfaces/TypescriptInterfaces";

type useAIResponseManagerType = {
    setIsAIResponding: (isAIResponding: any) => void,
    isProcessingResponseRef: React.RefObject<boolean>,
    currentLoadingIdRef: React.RefObject<string | null>,
    abortControllerRef: React.RefObject<AbortController | null>,
    cleanupTypingAnimation: () => void,
};

export const useAIResponseManager = ({
    setIsAIResponding,
    isProcessingResponseRef,
    currentLoadingIdRef,
    abortControllerRef,
    cleanupTypingAnimation,
}: useAIResponseManagerType) => {
    const clearAIResponding = useCallback(() => {
        console.log('Clearing AI responding state');

        cleanupTypingAnimation();

        setIsAIResponding((prevState: any) => {
            if (prevState) {
                console.log('AI responding state cleared');
            }
            return false;
        });

        isProcessingResponseRef.current = false;
        currentLoadingIdRef.current = null;

        // Clear abort controller
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        setTimeout(() => {
            setIsAIResponding(false);
            isProcessingResponseRef.current = false;
            currentLoadingIdRef.current = null;
        }, 100);
    }, [cleanupTypingAnimation]);

    return {
        clearAIResponding,
    };
};