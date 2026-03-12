import {
    TextField,
    InputBaseProps,
    SlotProps,
    TextFieldOwnerState,
    FormControl,
    InputLabel,
    Select,
    FormHelperText,
    SelectChangeEvent,
    MenuItem,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import { ChangeEventHandler } from 'react';
import { DatePicker, DatePickerProps, LocalizationProvider } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import * as React from 'react';
import 'dayjs/locale/it';
import 'dayjs/locale/en';
import { useForm } from '../context/FormContext';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

interface IValuesType {
    key: number;
    text: string | React.ReactNode;
}

interface IInput {
    type: 'text' | 'password' | 'multi' | 'date' | 'check';
    name: string;
    label: string;
    disabled?: boolean;
    inputProps?: SlotProps<React.ElementType<InputBaseProps['inputProps']>, {}, TextFieldOwnerState>;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    values?: IValuesType[];
    dataMoreOption?: DatePickerProps;
}

dayjs.extend(utc);
dayjs.extend(timezone);

export default function Input(props: IInput) {
    const { form, updateValue } = useForm();

    let element = undefined;

    const textChangeHandler =
        (name: string): ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> =>
        (action) => {
            updateValue(name, action.target.value);
        };

    const dateChangeHandler =
        (name: string): ((_event: any) => void) =>
        (action: Dayjs) => {
            if (action && action.isValid())
                updateValue(name, action.hour(0).minute(0).second(0).utc(true).toISOString());
        };

    const selectChangeHandler =
        (name: string): ((_event: SelectChangeEvent<string>) => void) =>
        (action) => {
            updateValue(name, props.values.find((value) => value.key === parseInt(action.target.value)).key);
        };

    const checkChangeHandler =
        (name: string): ((_event: any) => void) =>
        (action) => {
            updateValue(name, `${action.target.checked}`);
        };

    switch (props.type) {
        case 'text':
        case 'password':
            element = (
                <TextField
                    fullWidth
                    type={props.type}
                    error={form[props.name]?.error !== undefined}
                    helperText={form[props.name]?.error}
                    label={`${props.label}`}
                    name={props.name}
                    value={form[props.name]?.value || ''}
                    onChange={textChangeHandler(props.name)}
                    slotProps={{
                        htmlInput: props.inputProps,
                        input: { startAdornment: props.startAdornment, endAdornment: props.endAdornment },
                    }}
                    disabled={props.disabled}
                />
            );
            break;

        case 'date':
            element = (
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
                    <DatePicker
                        sx={{ width: '100%' }}
                        views={['year', 'month', 'day']}
                        label={`${props.label}`}
                        slotProps={{
                            textField: {
                                error: form[props.name]?.error !== undefined,
                                helperText: form[props.name]?.error,
                            },
                        }}
                        value={dayjs(form[props.name].value, 'YYYY-MM-DD', 'it')}
                        onChange={dateChangeHandler(props.name)}
                        disabled={props.disabled}
                        {...props.dataMoreOption}
                    />
                </LocalizationProvider>
            );
            break;

        case 'multi':
            element = (
                <FormControl fullWidth error={form[props.name]?.error !== undefined}>
                    <InputLabel id={`select-${props.name}`}>{props.label}</InputLabel>
                    <Select
                        sx={{
                            '.MuiSelect-select': {
                                display: 'inline-flex',
                            },
                        }}
                        labelId={`select-${props.name}`}
                        label={`${props.label}`}
                        name={props.name}
                        value={form[props.name]?.value || ""}
                        onChange={selectChangeHandler(props.name)}
                        disabled={props.disabled}
                    >
                        {props.values?.map((value, index) => {
                            return (
                                <MenuItem key={index} value={value.key}>
                                    {value.text}
                                </MenuItem>
                            );
                        })}
                    </Select>
                    <FormHelperText>{form[props.name]?.error}</FormHelperText>
                </FormControl>
            );
            break;

        case 'check':
            element = (
                <FormControlLabel
                    control={<Checkbox size="small" checked={form[props.name] !== undefined} />}
                    label={props.label}
                    onChange={checkChangeHandler(props.name)}
                />
            );
            break;
    }

    return element;
}

// class FormMultiTypeUtilities {
//     public static findByKey(source: IFormMultiType[], key: string): any {
//         return source.find(value => value.getKey() === key);
//     }
// }
