import { createSlice } from "@reduxjs/toolkit";

export const tokenExpiredSlice = createSlice({
    name: 'tokenExpired',
    initialState: {
        expired: false
    },
    reducers: {
        setExpiredToken: (state, value) => {
            state.expired = value.payload;
        }
    }
})

export const { setExpiredToken } = tokenExpiredSlice.actions;

export const expiredToken = (state) => state.tokenExpired.expired;

export default tokenExpiredSlice.reducer;