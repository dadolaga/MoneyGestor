import { FilledInputProps, FormControl, FormHelperText, InputLabel, InputProps, MenuItem, OutlinedInputProps, Select, SelectChangeEvent, TextField } from "@mui/material";
import { Form } from "../form/Form";
import { ChangeEventHandler, Dispatch, SetStateAction } from "react";
import { IPrintable } from "../Utilities/Interfaces";

interface IInput {
    type: "text" | "password" | "multi",
    form: Form,
    setForm: Dispatch<SetStateAction<Form>>,
    name: string,
    label: string,
    disabled: boolean,
    InputProps?: Partial<FilledInputProps> | Partial<OutlinedInputProps> | Partial<InputProps>,
    values?: IPrintable[],
}

export default function Input(props: IInput) {
    let element = undefined;

    const textChangeHandler = (name: string):  ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> => (action) => {
        props.setForm(form => form.setValue(name, action.target.value));
    }

    const selectChangeHandler = (name: string):  (event: SelectChangeEvent<string>) => void => (action) => {
        props.setForm(form => form.setValue(name, action.target.value));
    }

    switch(props.type) {
        case "text": element = (
            <TextField
                fullWidth
                error={props.form.haveError(props.name)}
                helperText={props.form.getError(props.name)}
                label={props.label}
                name={props.name}
                value={props.form.getStringValue(props.name)}
                onChange={textChangeHandler(props.name)}
                InputProps={props.InputProps}
                disabled={props.disabled} />
        ); break;
        case "password": element = (
            <TextField
                fullWidth
                type="password"
                error={props.form.haveError(props.name)}
                helperText={props.form.getError(props.name)}
                label={props.label}
                name={props.name}
                value={props.form.getStringValue(props.name)}
                onChange={textChangeHandler(props.name)}
                InputProps={props.InputProps}
                disabled={props.disabled} />
        ); break;
        case "multi": element = (
            <FormControl fullWidth error={props.form.haveError(props.name)}>
                <InputLabel id="select-color" >Color</InputLabel>
                <Select
                    sx={{
                        ".MuiSelect-select": {
                            display: 'inline-flex'
                        }
                    }}
                    labelId="select-color"
                    label="Colore"
                    name={props.name}
                    value={props.form.getValue(props.name)}
                    onChange={selectChangeHandler(props.name)}
                    disabled={props.disabled} >
                    { props.values?.map((value, index) => {
                        return (<MenuItem key={index} value={value as any}>{value.print()}</MenuItem>)
                    }) }
                </Select>
                <FormHelperText>{props.form.getError(props.name)}</FormHelperText>
            </FormControl>
        ); break;
    }

    return element;
}