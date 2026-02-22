import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

interface FormInformation {
    value: string | number;
    error?: string;
}

export type FormType = { [key: string]: FormInformation };

interface FormContext {
    form: FormType;
    updateValue: (_key: string, _value: string | number) => void;
    insertError: (_key: string, _value: string | number) => void;
    validate: () => boolean;
}

export type FormSettings = {
    [key: string]: {
        mandatory?: boolean;
        checkers?: {
            action: (_value: string | number) => boolean | string;
            message: string;
        }[];
    };
};

const FormContext = createContext(null);

export function checkIsInteger(text: string) {
    return /^[+-]?\s*\d+$/gm.test(text);
}

export function checkIsDecimal(text: string) {
    return /^[+-]?\s*\d+(?:[.,]\d+)?$/gm.test(text);
}

export function checkIsEmail(text: string) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/gm.test(text);
}

export function checkPassword(text: string) {
    if (text.length < 8) {
        return "La password deve essere lunga almeno 8 caratteri";
    }

    if (!/[a-z]/.test(text)) {
        return "La password deve contenere almeno una lettera minuscola";
    }

    if (!/[A-Z]/.test(text)) {
        return "La password deve contenere almeno una lettera maiuscola";
    }

    if (!/[0-9]/.test(text)) {
        return "La password deve contenere almeno un numero";
    }

    if (!/[!@#$%^&*()_+\-=]/gm.test(text)) {
        return "La password deve contenere almeno un carattere speciale";
    }

    return true;
}

export const useForm = () => useContext<FormContext>(FormContext);

export function FormProvider(props: { settings: FormSettings; children: ReactNode }) {
    const [form, setForm] = useState<FormType>({});

    const validate = useCallback(() => {
        const newForm = { ...form };
        let valid = true;

        Object.keys(props.settings).forEach((key) => {
            const value = form[key]?.value;
            const checkers = props.settings[key]?.checkers || [];

            if (value === undefined || value === null || value.toString().length === 0) {
                valid = false;

                if (value === undefined || value === null) {
                    newForm[key] = { value: null, error: "Il campo non può essere vuoto" };
                } else {
                    newForm[key].error = 'Il campo non può essere vuoto';
                }

                return;
            }

            checkers.forEach((checker) => {
                const checkResult = checker.action(value);
                if (checkResult === false || (typeof checkResult === 'string' && checkResult.length > 0)) {
                    newForm[key].error = typeof checkResult === 'string' ? checkResult : checker.message;
                    valid = false;
                }
            });
        });

        setForm(newForm);

        return valid;
    }, [form, props.settings]);

    const updateValue = (key: string, value: string | number) => {
        setForm({ ...form, [key]: { value: value, error: undefined } });
    };

    const insertError = (key: string, error: string) => {
        setForm({ ...form, [key]: { value: form[key]?.value, error: error } });
    }

    return <FormContext.Provider value={{ form, updateValue, insertError, validate }}>{props.children}</FormContext.Provider>;
}
