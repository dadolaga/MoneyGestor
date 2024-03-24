import { configureStore } from '@reduxjs/toolkit'
import userReducer from './userSlice'
import tokenExpiredReducer from './showTokenExpirated'

export default configureStore({
    reducer: {
        counter: userReducer,
        tokenExpired: tokenExpiredReducer,
    }
})