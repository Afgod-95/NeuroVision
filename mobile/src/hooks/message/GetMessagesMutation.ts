import axios from "axios";
import { useMutation } from "@tanstack/react-query";

export const useFetchMessagesMutation = () => {
    return useMutation({
        mutationFn: async (userId: string) => {
            const response = await axios.get('/api/chats/conversations', {
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