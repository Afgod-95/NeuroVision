import api from "@/src/services/axiosClient";
import { useMutation } from "@tanstack/react-query";
export const useFetchMessagesMutation = () => {
    return useMutation({
        mutationFn: async (userId: string) => {
            const response = await api.get('/api/conversations', {
                params: {
                    userId,
                    limit: 50,
                    offset: 0,
                },
            });
            return response.data;
        },

        onSuccess: (data) => {
            console.log(data)
            console.log("Messages fetched successfully");
        },
        onError: (error) => {
            console.log("Error fetching messages", error.message);
        }  
    })
}


//get conversation summary
export const useFetchConversationSummaryMutation = () => {
    return useMutation({
  mutationFn: async (userId: number) => {
    const response = await api.get('/api/conversations/user/summaries', {
      params: { userId }
    });
    console.log(response.data)
    return response.data;
  },
  retry: 3, // retry up to 3 times
  retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), 
  onError: (error) => {
    console.log("Error fetching conversation summary", error.message);
  }
});
}
