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
      <ThemeProvider theme={theme}>
        <SnackbarProvider>
          <Box sx={{position: 'relative', height: '100vh'}}>
            <Header />
            <Box sx={{display: 'flex', height: '100%'}}>
              <Drawer width={200} />
              <Box sx={{flexGrow: 1, display: 'flex', flexDirection: 'column'}}>
                  <Toolbar />
                  <Box sx={{margin: 2, flexGrow: 1, overflowY: 'hidden'}}>
                    {children}
                  </Box>
              </Box>
            </Box>
          </Box>
          <ShowTokenExpired />
        </SnackbarProvider>
      </ThemeProvider>
    </Provider>
  );
}

function ShowTokenExpired() {
  const router = useRouter();
  const open = useSelector(expiredToken);
  const dispatch = useDispatch();

  function clickOk() {
    router.push('/dashboard/user/login');
    dispatch(setExpiredToken(false));
  }

  return (
    <Dialog open={open} >
      <DialogTitle>
        Sessione terminata
      </DialogTitle>
      <DialogContent>
        La sessione per l&apos;utente è terminata. Rieffettuare il login
      </DialogContent>
      <DialogActions>
        <Button onClick={clickOk}>ok</Button>
      </DialogActions>
    </Dialog>
  );
}