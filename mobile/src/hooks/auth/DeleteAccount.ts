import { useMutation } from "@tanstack/react-query";
import { Alert } from "react-native";
import { router } from 'expo-router'

//delete user account 
interface DeleteUserAccountMutationVariables {
    id: number;
}

const DeleteUserAccountMutation = () => {
    return useMutation({
        mutationFn: async ({ id } : DeleteUserAccountMutationVariables)  => {
            const response = await fetch('/api/user/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id }),
            })
            return response.json();
        },
        onSuccess: (data) => {
            Alert.alert(data.message);
            router.push('/(auth)')
            console.log(data);
        },
        onError: (error) => {
            console.log(error);
        }
    })
}

export default DeleteUserAccountMutation;  