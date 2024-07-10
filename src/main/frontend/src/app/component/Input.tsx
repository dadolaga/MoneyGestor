import { FilledInputProps, FormControl, FormHelperText, InputLabel, InputProps, MenuItem, OutlinedInputProps, Select, SelectChangeEvent, TextField } from "@mui/material";
import { Form } from "../form/Form";
import { ChangeEventHandler, Dispatch, SetStateAction, useEffect, useState } from "react";
import { IFormMultiType } from "../Utilities/Interfaces";

interface IInput {
    type: "text" | "password" | "multi",
    form: Form,
    setForm: Dispatch<SetStateAction<Form>>,
    name: string,
    label: string,
    disabled: boolean,
    InputProps?: Partial<FilledInputProps> | Partial<OutlinedInputProps> | Partial<InputProps>,
    values?: IFormMultiType[],
}

export default function Input(props: IInput) {
    const [value, setValue] = useState<string>("");

    useEffect(() => {
        let value = props.form.getStringValue(props.name);
        if (value) {
            console.log(value);
            setValue(value);
        }
    }, [props.form])

    let element = undefined;

    const textChangeHandler = (name: string):  ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> => (action) => {
        props.setForm(form => form.setValue(name, action.target.value));
    }

    const selectChangeHandler = (name: string):  (event: SelectChangeEvent<string>) => void => (action) => {
        props.setForm(form => form.setValue(name, FormMultiTypeUtilities.findByKey(props.values, action.target.value)));
    }

    switch(props.type) {
        case "text": element = (
            <TextField
                fullWidth
                error={props.form.haveError(props.name)}
                helperText={props.form.getError(props.name)}
                label={props.label}
                name={props.name}
                value={value}
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
                value={value}
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
                    value={value}
                    onChange={selectChangeHandler(props.name)}
                    disabled={props.disabled} >
                    { props.values?.map((value, index) => {
                        return (<MenuItem key={index} value={value.getKey()}>{value.print()}</MenuItem>)
                    }) }
                </Select>
                <FormHelperText>{props.form.getError(props.name)}</FormHelperText>
            </FormControl>
        ); break;
    }

    return element;
}

class FormMultiTypeUtilities {
    public static findByKey(source: IFormMultiType[], key: string): any {
        return source.find(value => value.getKey() === key);
    }
}