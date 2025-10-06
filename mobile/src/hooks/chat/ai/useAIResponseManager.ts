import { useCallback } from "react";
import { setIsAIResponding } from "@/src/redux/slices/chatSlice";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/src/redux/store";

type useAIResponseManagerType = {
    isProcessingResponseRef: React.RefObject<boolean>,
    currentLoadingIdRef: React.RefObject<string | null>,
    abortControllerRef: React.RefObject<AbortController | null>,
    cleanupTypingAnimation: () => void,
};

export const useAIResponseManager = ({
    isProcessingResponseRef,
    currentLoadingIdRef,
    abortControllerRef,
    cleanupTypingAnimation,
}: useAIResponseManagerType) => {
    const dispatch = useDispatch<AppDispatch>();

    /**
     * Clears AI responding state WITHOUT aborting the request.
     * This should be called when the response is complete or after an error.
     * To abort a request, use the abortMessage function from useConversationActions.
     */
    const clearAIResponding = useCallback(() => {
        console.log("🧹 Clearing AI responding state (no abort)");

        // Note: We don't cleanup typing here - let it finish naturally
        // cleanupTypingAnimation();

        // Reset Redux + refs
        dispatch(setIsAIResponding(false));
        isProcessingResponseRef.current = false;
        // Don't clear currentLoadingIdRef here - typing animation needs it
        // currentLoadingIdRef.current = null;

        // ✅ DO NOT abort here - let the mutation handle cleanup
        // The abort controller should only be cleared, not aborted
        // If you need to abort, call abortMessage() from useConversationActions
        abortControllerRef.current = null;

    }, [abortControllerRef, isProcessingResponseRef, dispatch]);

    /**
     * Force aborts any in-flight request and clears state.
     * Use this when you explicitly want to cancel a request (e.g., user clicks stop button).
     */
    const forceAbortAndClear = useCallback(() => {
        console.log("🛑 Force aborting AI request");

        cleanupTypingAnimation();

        // Abort the request if one is in flight
        if (abortControllerRef.current) {
            console.log("⚠️ Aborting controller");
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        // Reset state
        dispatch(setIsAIResponding(false));
        isProcessingResponseRef.current = false;
        currentLoadingIdRef.current = null;
    }, [cleanupTypingAnimation, abortControllerRef, currentLoadingIdRef, isProcessingResponseRef, dispatch]);

    return { 
        clearAIResponding,
        forceAbortAndClear 
    };
};