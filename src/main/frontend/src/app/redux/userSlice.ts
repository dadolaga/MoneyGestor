import { createSlice } from "@reduxjs/toolkit";

export const userSlice = createSlice({
    name: 'user',
    initialState: {
        name: null
    },
    reducers: {
        changeName: (state, newName) => {
            state.name = newName.payload;
        }
    }
})

export const { changeName } = userSlice.actions;

export const selectUser = (state) => state.counter.name;

export default userSlice.reducer;