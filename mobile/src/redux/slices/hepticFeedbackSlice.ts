import { createSlice } from "@reduxjs/toolkit";

interface HepticFeedbackType {
    enableHepticFeedback: boolean;
}

const initialState: HepticFeedbackType = {
    enableHepticFeedback: true,
}

const hepticFeedback = createSlice({
    name: "hepticFeedback",
    initialState,
    reducers: {
        setEnableHepticFeedback: (state, action) => {
            state.enableHepticFeedback = action.payload;
        }
    }
})

export const { setEnableHepticFeedback } = hepticFeedback.actions;
export default hepticFeedback.reducer;
