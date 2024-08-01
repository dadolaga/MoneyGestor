import { useRef, useState } from "react";
import { CreateWalletForm } from "../../Utilities/BackEndTypes";
import axios from "../../axios/axios";
import { useRestApi } from "../../request/Request";

import './wallet.css';

const WALLET_DEFAULT: CreateWalletForm = {
    name: "",
    value: 0,
    color: ""
}

interface WalletDialogInterface {
    open: boolean,
    onClose: (isSave: boolean) => void,
    walletId?: number
}


  const WalletDialog = ({ onClose }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const form = useRef();

    const [nameError, setNameError] = useState<string>(undefined);
    const [valueError, setValueError] = useState<string>(null);
    const [colorError, setColorError] = useState<string>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [wallet, setWallet] = useState<CreateWalletForm>(WALLET_DEFAULT);
    const [colors, setColors] = useState([]);
    const [Name, setName] = useState("");
    const [number, setNumber] = useState("");
    const [color, setColor] = useState(null);
    
    const onClickResetHandler = () => {
        setName('');
        setNumber('');
        setColor('black')
    }

    const restApi = useRestApi();

    // useEffect(() => {
    //     if(!open)
    //         return;

    //     setWallet({
    //         name: "",
    //         value: 0,
    //         color: ""
    //     });

    //     setValueError(undefined);
    //     setNameError(undefined);
    //     setColorError(undefined);

    //     setLoading(true);

    //     let promiseList = [];

    //     promiseList.push(loadColor());
    //     if (open && walletId != null) {
    //         promiseList.push(loadWallet());
    //     }

    //     Promise.all(promiseList).finally(() => {
    //         setLoading(false);
    //     })

    // }, [open]);

    // function loadWallet() {
    //     restApi.Wallet.Get(walletId)
    //     .then(wallet => setWallet(wallet));
    // }

    const loadColor = () => {
        axios.get("/color/list")
        .then((message) => {
            let colorList = [];
            message.data.forEach((el) => {
                colorList.push(el.color);
            })

            setColors(colorList);
        })
    }

    // const saveOrModifyHandler = () => {
    //     const formData = new FormData(form.current);
    //     let myWallet: CreateWalletForm = WALLET_DEFAULT;

    //     setNameError(null);
    //     setValueError(null);

    //     const name = wallet.name;
    //     const stringValue = wallet.value.toString().replaceAll(/\s+/g, "");

    //     if (checkError())
    //         return;

    //     myWallet.name = name;
    //     myWallet.value = parseFloat(stringValue.replace(",", "."));
    //     myWallet.color = wallet.color;

    //     if(walletId == null)
    //         saveNewWallet();
    //     else 
    //         editWallet(myWallet, walletId);

    //     function checkError() {
    //         const valueRegex = /^[\d]+(?:[\.,][\d]+)?$/;
    //         let thereIsError = false;

    //         if (name.trim().length == 0) {
    //             setNameError("Il nome non può essere vuoto");
    //             thereIsError = true;
    //         }

    //         if (!valueRegex.test(stringValue)) {
    //             setValueError("Il valore deve essere un valore monetario valido");
    //             thereIsError = true;
    //         }

    //         if(wallet.color == "") {
    //             setColorError("Il colore è un campo obbligatorio");
    //             thereIsError = true;
    //         }

    //         return thereIsError;
    //     }

    //     function editWallet(wallet, walletId) {
    //         setLoading(true);

    //         restApi.Wallet.Modify(walletId, wallet)
    //         .then(() => {
    //             onClose(true);
    //         })
    //         .catch(Request.ErrorGestor([{
    //             code: 102,
    //             action: _ => {
    //                 setNameError("Il nome è gia presente");
    //             }
    //         }]))
    //         .finally(() => {
    //             setLoading(false);
    //         })
    //     }

    //     function saveNewWallet() {
    //         setLoading(true);

    //         restApi.Wallet.Create(wallet)
    //         .then(id => {
    //             onClose(true);
    //         })
    //         .catch(Request.ErrorGestor([{
    //             code: 102,
    //             action: _ => setNameError("Il nome esiste già"),
    //         }]))
    //         .finally(() => {
    //             setLoading(false);
    //         })
    //     }
    // }

    // const onCloseHandler = () => {
    //     onClose(false);
        
    // }
    

    return (
        <div className="popUp_page" >
            <div className="popUp_page__container">
                <div className="popUp_container">
                    <h1 className="popUp_text" id="font">Crea un nuovo portafoglio</h1>
                    <div className="input_text">
                        <label className='text' id="font" htmlFor="username">
                            Nome portafoglio
                            <input type="text" className="information " id="username" name="username" value={Name}
                            onChange={(e) => setName(e.target.value)}/>
                        </label>
                        
                        <label htmlFor="quantity" className='text' id="font">
                            Ammontare
                            <input type="number" className="information " id="quantity" name="quantity" min="1" max="1000000" value={number}
                            onChange={(e) => setNumber(e.target.value)}/>
                        </label>
                    </div>

                    <label htmlFor="favcolor" className="popUp_text" id="font">
                        Scegli un colore 
                        <input className="color_picker" id="favcolor" name="favcolor" type="color" value={color} onChange={e => setColor(e.target.value)}/>
                    </label>

                    <button type="submit" value="Submit" className="submit" id="font" onClick={() => setIsPopoverOpen(!isPopoverOpen)} disabled={loading}>Salva  </button>
                    <button type="reset" value="Reset" className="submit" id="font" onClick={onClose}> Annulla </button>
                </div>
                
            </div>
        </div>
        //finestra pop-up per aggiungere
        
        // <div className="dialog" style={{ color: 'red', backgroundColor: 'gray'}}>
        //     <div className="dialog-title" >
        //         Crea nuovo portafoglio
        //     </div>
        //     {loading && <div className="linear-progress"></div>}
        //     <div className="dialog-content">
        //         <form ref={form}>
        //         <div className="grid-container" style={{ marginTop: 1 }}>
        //             <div className="grid-item" >
        //             <input
        //                 type="text"
        //                 name="name"
        //                 value={wallet.name}
        //                 onChange={(e) => setWallet({ name: e.target.value, value: wallet.value, color: wallet.color })}
        //                 disabled={loading}
        //             />
        //             </div>
        //             <div className="grid-item" >
        //             <input
        //                 type="number"
        //                 name="value"
        //                 value={wallet.value}
        //                 onChange={(e) => setWallet({ name: wallet.name, value: parseInt(e.target.value), color: wallet.color })}
        //                 disabled={loading || walletId != undefined}
        //             />
        //             <span className="input-adornment">€</span>
        //             </div>
        //             <div className="grid-item" >
        //             <select
        //                 name="color"
        //                 value={wallet.color}
        //                 onChange={(e) => setWallet({ name: wallet.name, value: wallet.value, color: e.target.value })}
        //                 disabled={loading}
        //             >
        //                 {colors.map((value, index) => (
        //                 <option key={index} value={value}>
        //                     <span
        //                     style={{
        //                         height: '20px',
        //                         width: '20px',
        //                         backgroundColor: '#' + value,
        //                         marginRight: '10px',
        //                     }}
        //                     ></span>
        //                     #{value}
        //                 </option>
        //                 ))}
        //             </select>
        //             <span className="form-helper-text">{colorError}</span>
        //             </div>
        //         </div>
        //         </form>
        //     </div>
        //     <div className="dialog-actions">
        //         <button onClick={onCloseHandler} color="secondary">Annulla</button>
        //         <button onClick={saveOrModifyHandler} disabled={loading}>
        //             {walletId != null ? "modifica" : "salva"}
        //         </button>
        //     </div>
        //     </div>
        
        // <Dialog open={open} onClose={onClose} PaperProps={{}}>
        //     {loading && <LinearProgress />}
        //     <DialogTitle color={'#' + parseInt(wallet.color)}>Crea nuovo portafoglio</DialogTitle>
        //     <DialogContent>
        //         <DialogContentText>
        //         </DialogContentText>
        //         <Grid ref={form} container spacing={2} sx={{ marginTop: 1 }} component="form">
        //             <Grid item xs={8}>
        //                 <TextField
        //                     fullWidth 
        //                     error={nameError != null} 
        //                     helperText={nameError} 
        //                     label="Nome" 
        //                     name="name" 
        //                     value={wallet.name}
        //                     onChange={(text) => setWallet({ name: text.target.value, value: wallet.value, color: wallet.color })} 
        //                     disabled={loading} />
        //             </Grid>
        //             <Grid item xs={4}>
        //                 <TextField
        //                     fullWidth
        //                     error={valueError != null}
        //                     helperText={valueError}
        //                     label="Valore iniziale"
        //                     name="value"
        //                     value={wallet.value}
        //                     onChange={(text) => setWallet({ name: wallet.name, value: parseInt(text.target.value), color: wallet.color })}
        //                     InputProps={{ endAdornment: <InputAdornment position="start">€</InputAdornment> }}
        //                     disabled={loading || walletId != undefined} />
        //             </Grid>
        //             <Grid item xs={12}>
        //                 <FormControl fullWidth error={colorError != null}>
        //                     <InputLabel id="select-color" >Color</InputLabel>
        //                     <Select
        //                         sx={{
        //                             ".MuiSelect-select": {
        //                                 display: 'inline-flex'
        //                             }
        //                         }}
        //                         labelId="select-color"
        //                         label="Colore"
        //                         name="color"
        //                         value={wallet.color}
        //                         onChange={(text) => setWallet({ name: wallet.name, value: wallet.value, color: text.target.value })}
        //                         disabled={loading} >
        //                         { colors.map((value, index) => {
        //                             return (<MenuItem key={index} value={value}><span style={{height: '20px', width: '20px', backgroundColor: '#' + value, marginRight: "10px"}}></span>#{value}</MenuItem>)
        //                         }) }
        //                     </Select>
        //                     <FormHelperText>{colorError}</FormHelperText>
        //                 </FormControl>
        //             </Grid>
        //         </Grid>
        //     </DialogContent>
        //     <DialogActions>
        //         <Button onClick={onCloseHandler} color="secondary" >Annulla</Button>
        //         <Button onClick={saveOrModifyHandler} disabled={loading}>{walletId != null? "modifica" : "salva"}</Button>
        //     </DialogActions>
        // </Dialog>
    );
}
export default WalletDialog;