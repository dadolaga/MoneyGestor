import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface FormInformation {
    value: string | number | null;
    error?: string;
}

export type FormType = { [key: string]: FormInformation };
export type DefaultFormType = { [key: string]: string | undefined };

interface FormContext {
    form: FormType;
    updateValue: (_key: string, _value: string | number) => void;
    insertError: (_key: string, _value: string) => void;
    validate: () => boolean;
}

export interface FormProvideProps {
    settings: FormSettings;
    default?: DefaultFormType;
    onUpdate?: (values: FormType, keyUpdated: string) => void;
    children: ReactNode;
}

export type FormSettings = {
    [key: string]: {
        mandatory?: boolean;
        checkers?: {
            action: (_value: string | number | null, form: FormType) => boolean | string;
            message: string;
        }[];
    };
};

const FormContext = createContext<FormContext>({
    form: {},
    updateValue: () => {},
    insertError: () => {},
    validate: () => true,
});

export function checkIsInteger(text: string | number | null) {
    return /^[+-]?\s*\d+$/gm.test(`${text}`);
}

export function checkIsDecimal(text: string | number | null) {
    return /^[+-]?\s*\d+(?:[.,]\d+)?$/gm.test(`${text}`);
}

export function checkIsEmail(text: string | number | null) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/gm.test(`${text}`);
}

export function checkPassword(text: string | number | null) {
    if (text === null) {
        return 'La password non può essere vuota';
    }

    if (typeof text !== 'string') {
        return 'La password deve essere una stringa';
    }

    if (text.length < 8) {
        return 'La password deve essere lunga almeno 8 caratteri';
    }

    if (!/[a-z]/.test(text)) {
        return 'La password deve contenere almeno una lettera minuscola';
    }

    if (!/[A-Z]/.test(text)) {
        return 'La password deve contenere almeno una lettera maiuscola';
    }

    if (!/[0-9]/.test(text)) {
        return 'La password deve contenere almeno un numero';
    }

    if (!/[!@#$%^&*()_+\-=]/gm.test(text)) {
        return 'La password deve contenere almeno un carattere speciale';
    }

    return true;
}

export const useForm = () => useContext<FormContext>(FormContext);

export function FormProvider(props: FormProvideProps) {
    const [form, setForm] = useState<FormType>({});

    useEffect(() => {
        if (props.default) {
            console.log('default param', props.default);

            queueMicrotask(() => {
                setForm(
                    Object.keys(props.default!).reduce((acc: FormType, key) => {
                        acc[key] = { value: props.default![key] ?? null, error: undefined };
                        return acc;
                    }, {}),
                );
            });
        }
    }, [props.default]);

    const validate = useCallback(() => {
        const newForm = { ...form };
        let valid = true;

        Object.keys(props.settings).forEach((key) => {
            const value = form[key]?.value;
            const isMandatory = props.settings[key]?.mandatory ?? false;
            const checkers = props.settings[key]?.checkers ?? [];

            // Reset error value
            if (newForm[key] === undefined) {
                newForm[key] = { value: null, error: undefined };
            } else {
                newForm[key].error = undefined;
            }

            if (isMandatory && (value === undefined || value === null || value.toString().length === 0)) {
                valid = false;

                newForm[key].error = 'Il campo non può essere vuoto';

                return;
            }

            checkers.forEach((checker) => {
                const checkResult = checker.action(value, newForm);
                if (checkResult === false || (typeof checkResult === 'string' && checkResult.length > 0)) {
                    newForm[key].error = typeof checkResult === 'string' ? checkResult : checker.message;
                    valid = false;
                }
            });
        });

        setForm(newForm);

        return valid;
    }, [form, props.settings]);

    const updateValue = useCallback(
        (key: string, value: string | number) => {
            setForm((form) => {
                const newValue = { ...form, [key]: { value: value, error: undefined } };

                if (props.onUpdate != undefined) {
                    props.onUpdate(newValue, key);
                }

                return newValue;
            });
        },
        [props],
    );

    const insertError = useCallback((key: string, error: string) => {
        setForm((form) => ({ ...form, [key]: { value: form[key]?.value, error: error } }));
    }, []);

    return (
        <FormContext.Provider value={{ form, updateValue, insertError, validate }}>
            {props.children}
        </FormContext.Provider>
    );
}
