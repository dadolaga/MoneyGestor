import { faArrowRightArrowLeft, faWallet, faMoneyBillTrendUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Drawer as MaterialDrawer, useMediaQuery, useTheme } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useIsMobile } from "../utilities/useMobile";

export default function Drawer({ width, open, hide }) {
    const router = useRouter();
    const isMobile = useIsMobile();

    const openPage = (link) => () => {
        hide();
        router.push(link);
    }

    return (
        <MaterialDrawer sx={{ flexShrink: 0, width: width + 'px', '& .MuiDrawer-paper': { width: width + 'px' } }} variant={isMobile ? "temporary" : "permanent"} anchor="left" open={open}>
            <Toolbar />
            <List>
                <ListItem disablePadding>
                    <ListItemButton onClick={openPage('/dashboard/wallet')}>
                        <ListItemIcon>
                            <FontAwesomeIcon icon={faWallet} />
                        </ListItemIcon>
                        <ListItemText primary='Portafoglio' />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton onClick={openPage('/dashboard/transaction')}>
                        <ListItemIcon>
                            <FontAwesomeIcon icon={faArrowRightArrowLeft} />
                        </ListItemIcon>
                        <ListItemText primary='Transazioni' />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton onClick={openPage('/dashboard/bank_stocks')}>
                        <ListItemIcon>
                            <FontAwesomeIcon icon={faMoneyBillTrendUp} />
                        </ListItemIcon>
                        <ListItemText primary='Azioni' />
                    </ListItemButton>
                </ListItem>
            </List>
        </MaterialDrawer>
    );
}