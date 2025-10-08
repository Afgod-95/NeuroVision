
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";


const useAuthHeaders = () => {
    const { accessToken } = useSelector((state: RootState) => state.auth);
    const authHeader = { headers: {
        Authorization: `Bearer ${accessToken}` 
    }};
    return {
        authHeader,
    };
};

export default useAuthHeaders;
