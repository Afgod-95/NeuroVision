import { createSlice, PayloadAction } from "@reduxjs/toolkit";
interface SearchState {
  search: string,
}

const initialState: SearchState = {
  search: "",
}

const searchSlice = createSlice({
    name: 'search',
    initialState,
    reducers: {
        setSearch: (state, action: PayloadAction<string>) => {
            state.search = action.payload
        },
        clearSearch: (state) => {
            state.search = ""
        }
    }
})
export const { setSearch, clearSearch } = searchSlice.actions;
export default searchSlice.reducer;
