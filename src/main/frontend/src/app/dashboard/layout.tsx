"use client"

import { ThemeProvider } from '@emotion/react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Toolbar } from "@mui/material";
import { ThemeOptions, createTheme } from '@mui/material/styles';
import { useRouter } from "next/navigation";
import { SnackbarProvider } from "notistack";
import { Provider, useDispatch, useSelector } from 'react-redux';
import { expiredToken, setExpiredToken } from "../redux/showTokenExpirated";
import store from '../redux/store';
import Drawer from "./drawer";
import Header from "./header";

export const themeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff0000',
    },
    secondary: {
      main: '#f50057',
    },
  },
};

export const theme = createTheme(themeOptions);

export default function DashboardLayout({children}) {  
  return (
    <Provider store={store}>
      <SnackbarProvider>
        <div style={{height: "100vh", width: "100vw", display: "flex", flexDirection: 'column'}}>
          <Header />
          <div style={{height: "100%", width: "100%"}}>
            <div style={{padding: 16, height: "calc(100% - 32px)"}}>
              {children}
            </div>
          </div>
        </div>
      </SnackbarProvider>
    </Provider>
  );
}