import { RootState } from "@/src/redux/store";
import api from "@/src/services/axiosClient";
import { useMutation } from "@tanstack/react-query";
import { useSelector } from "react-redux";


export const useConversationMutation = (accessToken: string) => {
  const useFetchMessagesMutation = () => {
    return useMutation({
      mutationFn: async () => {
        const response = await api.get('/api/conversations', {
          params: {
            limit: 50,
            offset: 0,
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
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
  };

  const useFetchConversationSummaryMutation = () => {
    return useMutation({
      mutationFn: async () => {
        const response = await api.get('/api/conversations/user/summaries', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        });
        console.log(response.data)
        return response.data;
      },
      retry: 3, // retry up to 3 times
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error) => {
        console.log("Error fetching conversation summary", error.message);
      }
    })
  };

  return {
      useFetchConversationSummaryMutation, useFetchMessagesMutation
  }
}
