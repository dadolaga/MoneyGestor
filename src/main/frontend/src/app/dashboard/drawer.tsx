import { faArrowRightArrowLeft, faWallet } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Drawer as MaterialDrawer } from "@mui/material";
import { useRouter } from "next/navigation";

export default function Drawer({width}) {
  const router = useRouter();

    return (
        <MaterialDrawer sx={{flexShrink: 0, width: width + 'px', '& .MuiDrawer-paper': {width: width + 'px'}}} variant="permanent" anchor="left">
          <Toolbar />
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={() => router.push('/dashboard/wallet')}>
                <ListItemIcon>
                  <FontAwesomeIcon icon={faWallet} />
                </ListItemIcon>
                <ListItemText primary='Portafoglio' />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => router.push('/dashboard/transaction')}>
                <ListItemIcon>
                  <FontAwesomeIcon icon={faArrowRightArrowLeft} />
                </ListItemIcon>
                <ListItemText primary='Transazioni' />
              </ListItemButton>
            </ListItem>
          </List>
        </MaterialDrawer>
    );
}