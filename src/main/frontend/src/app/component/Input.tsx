import { FilledInputProps, FormControl, FormHelperText, InputLabel, InputProps, MenuItem, OutlinedInputProps, Select, SelectChangeEvent, TextField } from "@mui/material";
import { Form } from "../form/Form";
import { ChangeEventHandler, Dispatch, SetStateAction, useEffect, useState } from "react";
import { IFormMultiType } from "../Utilities/Interfaces";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import dayjs, { Dayjs } from "dayjs";
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import * as React from 'react';
import 'dayjs/locale/it'
import 'dayjs/locale/en'

interface IInput {
    type: "text" | "password" | "multi" | "date",
    form: Form,
    setForm: Dispatch<SetStateAction<Form>>,
    name: string,
    label: string,
    disabled: boolean,
    InputProps?: Partial<FilledInputProps> | Partial<OutlinedInputProps> | Partial<InputProps>,
    values?: IFormMultiType[],
}

dayjs.extend(utc);
dayjs.extend(timezone);

export default function Input(props: IInput) {
    const [value, setValue] = useState<string>("");

    useEffect(() => {
        let value = props.form.getStringValue(props.name);
        if (value !== undefined) {
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

    const dateChangeHandler = (name: string):  (event: any) => void => (action: Dayjs) => {
        props.setForm(form => form.setValue(name, action.hour(0).minute(0).second(0).toISOString()));
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
                <InputLabel id={`select-${props.name}`} >{props.label}</InputLabel>
                <Select
                    sx={{
                        ".MuiSelect-select": {
                            display: 'inline-flex'
                        }
                    }}
                    labelId={`select-${props.name}`}
                    label={props.label}
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

        case "date": element = (
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
                <DatePicker
                    timezone="UTC"
                    sx={{width: '100%'}}
                    views={["year", "month", "day"]}
                    label={props.label}
                    slotProps={{
                        textField: {
                            error: props.form.haveError(props.name),
                            helperText: props.form.getError(props.name),
                        }
                    }}
                    value={dayjs.utc(value)}
                    onChange={dateChangeHandler(props.name)}
                    disabled={props.disabled} />
            </LocalizationProvider>
        ); break;
    }

    return element;
}

class FormMultiTypeUtilities {
    public static findByKey(source: IFormMultiType[], key: string): any {
        return source.find(value => value.getKey() === key);
    }
}