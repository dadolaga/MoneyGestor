import type { DOMAttributes } from 'react';

import type { ButtonOwnProps } from '@mui/material';
import { Button } from '@mui/material';

import type { FormType } from '../context/FormContext';
import { useForm } from '../context/FormContext';

export interface IProps extends ButtonOwnProps, DOMAttributes<HTMLButtonElement> {
    label: string;
    onValidate?: (_form: FormType) => Promise<void>;
}

export default function Submit(props: IProps) {
    const { form, validate, insertError } = useForm();

    const submitHandler = () => {
        if (!validate()) return;

        if (props.onValidate === undefined) return;

        props.onValidate(form).catch((error) => {
            Object.keys(error).forEach((key) => {
                insertError(key, error[key]);
            });
        });
    };

    return (
        <Button {...props} onClick={submitHandler}>
            {props.label}
        </Button>
    );
}
