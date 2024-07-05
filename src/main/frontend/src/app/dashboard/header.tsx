"use client"

import { useRouter } from 'next/navigation';
import { useCookies } from 'react-cookie';
import './header.css';

export default function Header() {
    const [cookies, setCookie] = useCookies(["_token", "_displayName"]);

    const router = useRouter();

    function stringToColor(string) {
        let hash = 0;
        let i;

        /* eslint-disable no-bitwise */
        for (i = 0; i < string.length; i += 1) {
            hash = string.charCodeAt(i) + ((hash << 5) - hash);
        }

        let color = '#';

        for (i = 0; i < 3; i += 1) {
            const value = (hash >> (i * 8)) & 0xff;
            color += `00${value.toString(16)}`.slice(-2);
        }
        /* eslint-enable no-bitwise */

        return color;
    }

    function stringAvatar(name) {
        return {
            sx: {
                bgcolor: stringToColor(name),
            },
            children: `${name.split(' ')[0][0]}${name.split(' ')[1][0]}`,
        };
    }

    return (
        <div className='navbar_container'>
            <div id="menu">
                <div id="menu-bar" onClick={menuOnClick}>
                    <div id="bar1" className="bar"></div>
                    <div id="bar2" className="bar"></div>
                    <div id="bar3" className="bar"></div>
                </div>
                <nav className="nav" id="nav">
                    <ul>
                    <li><a href="#">Portfaoglio</a></li>
                    <li><a href="#">Transizioni</a></li>
                    <li><a href="#">Planner</a></li>
                    </ul>
                </nav> 
            </div>

            <div className="menu-bg" id="menu-bg"></div>

            <nav className='navbar_right'>
                <a href="#" className='link_login'>Login</a>
                <a href="#" className='link_register'>Register</a>
            </nav>
        </div>
            
        
        
        // <AppBar sx={{ zIndex: 1300 }}>
        //     <Toolbar>
        //         <IconButton sx={{ mr: 2 }} color='inherit'>
        //             <FontAwesomeIcon icon={faBars} />
        //         </IconButton>
        //         <Typography variant="h6" component={"div"} sx={{ flexGrow: 1 }}>Money Gestor</Typography>

        //         {(!cookies._displayName) && (
        //             <>
        //                 <Button color='inherit' onClick={() => router.push('/dashboard/user/login')}>Login</Button>
        //                 <Button color='inherit' onClick={() => router.push('/dashboard/user/new')}>Registrati</Button>
        //             </>
        //         )}

        //         {(cookies._displayName) && (
        //             <Box sx={{display: 'flex', gap: 2, alignItems: 'center'}}>
        //                 <Typography align='center'>{cookies._displayName}</Typography>
        //                 <Avatar {... stringAvatar(cookies._displayName)} />
        //             </Box>
        //         )}

        //     </Toolbar>
        // </AppBar>
    )
    function menuOnClick() {
        document.getElementById('menu-bar').classList.toggle('change');
        document.getElementById('nav').classList.toggle('change');
        document.getElementById('menu-bg').classList.toggle('change-bg');
      }
}