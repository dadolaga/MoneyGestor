"use client"

import { AppBar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Toolbar } from "@mui/material";
import Header from "./header";
import Drawer from "./drawer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWallet } from "@fortawesome/free-solid-svg-icons";
import { ThemeOptions, createTheme } from '@mui/material/styles'
import { orange } from '@mui/material/colors'
import { ThemeProvider } from '@emotion/react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import store from '../redux/store'
import { expiredToken, setExpiredToken } from "../redux/showTokenExpirated";
import { selectUser } from "../redux/userSlice";
import { useRouter } from "next/navigation";

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