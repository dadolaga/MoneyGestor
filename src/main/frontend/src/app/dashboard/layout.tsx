"use client"

import { Box, Toolbar } from "@mui/material";
import Header from "./header";
import Drawer from "./drawer";
import { ThemeOptions, createTheme } from '@mui/material/styles'
import { ThemeProvider } from '@emotion/react'
import { SnackbarProvider } from "notistack";

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
      </SnackbarProvider>
    </ThemeProvider>
  );
}