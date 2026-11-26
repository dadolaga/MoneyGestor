import type { ChangeEventHandler } from 'react';
import * as React from 'react';

import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import type { InputBaseProps, SlotProps, TextFieldOwnerState, SelectChangeEvent } from '@mui/material';
import {
    TextField,
    FormControl,
    InputLabel,
    Select,
    FormHelperText,
    MenuItem,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import type { DatePickerProps } from '@mui/x-date-pickers';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import 'dayjs/locale/it';
import 'dayjs/locale/en';

import { useForm } from '../context/FormContext';

interface IValuesType {
    key: number;
    text: string | React.ReactNode;
}

interface IInput {
    type: 'text' | 'password' | 'multi' | 'date' | 'check';
    name: string;
    label: string;
    disabled?: boolean;
    inputProps?: SlotProps<React.ElementType<InputBaseProps['inputProps']>, object, TextFieldOwnerState>;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    values?: IValuesType[];
    emptySelect?: boolean;
    dataMoreOption?: DatePickerProps;
    onChange?: (action: any) => void;
    size?: 'small' | 'medium';
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

            if (props.onChange) {
                props.onChange(action);
            }
        };

    const dateChangeHandler =
        (name: string): ((_event: any) => void) =>
        (action: Dayjs) => {
            if (action && action.isValid())
                updateValue(name, action.hour(0).minute(0).second(0).utc(true).toISOString());

            if (props.onChange) {
                props.onChange(action);
            }
        };

    const selectChangeHandler =
        (name: string): ((_event: SelectChangeEvent<any>) => void) =>
        (action) => {
            const findResult = props.values?.find((value) => value.key === parseInt(action.target.value));

            if (!findResult) return;

            updateValue(name, findResult.key);

            if (props.onChange) {
                props.onChange(action);
            }
        };

    const checkChangeHandler =
        (name: string): ((_event: any) => void) =>
        (action) => {
            updateValue(name, `${action.target.checked}`);

            if (props.onChange) {
                props.onChange(action);
            }
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
                    size={props.size}
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
                                size: props.size,
                            },
                        }}
                        value={
                            // eslint-disable-next-line react/jsx-no-leaked-render
                            form[props.name]?.value !== undefined
                                ? dayjs(form[props.name].value, 'YYYY-MM-DD', 'it')
                                : null
                        }
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
                    <InputLabel id={`select-${props.name}`} size={props.size}>
                        {props.label}
                    </InputLabel>
                    <Select
                        sx={{
                            '.MuiSelect-select': {
                                display: 'inline-flex',
                            },
                        }}
                        labelId={`select-${props.name}`}
                        label={`${props.label}`}
                        name={props.name}
                        value={form[props.name]?.value || ''}
                        onChange={selectChangeHandler(props.name)}
                        disabled={props.disabled}
                        size={props.size}
                    >
                        {props.values !== undefined && props.emptySelect === true && (
                            <MenuItem key={0}>&nbsp;</MenuItem>
                        )}
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
