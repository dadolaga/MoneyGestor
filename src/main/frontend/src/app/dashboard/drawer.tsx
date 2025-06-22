import { faArrowRightArrowLeft, faWallet } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Drawer as MaterialDrawer, useMediaQuery, useTheme } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useIsMobile } from "../utilities/useMobile";

export default function Drawer({ width, open }) {
    const router = useRouter();
    const isMobile = useIsMobile();

    return (
        <MaterialDrawer sx={{ flexShrink: 0, width: width + 'px', '& .MuiDrawer-paper': { width: width + 'px' } }} variant={isMobile? "temporary" : "permanent"} anchor="left" open={open}>
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