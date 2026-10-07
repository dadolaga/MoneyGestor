'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import type { FieldValues } from 'react-hook-form';

import { InputField, type InputFieldProps } from '@/components/shared/form-controls';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, LockKeyhole } from '@/components/ui/icons';

export function AuthPasswordField<T extends FieldValues>(props: Omit<InputFieldProps<T>, 'kind' | 'type' | 'startAdornment' | 'endAdornment'>) {
    const t = useTranslations('Auth.password');
    const [isVisible, setIsVisible] = useState(false);
    const startAdornment = <LockKeyhole aria-hidden="true" className="size-5" />;
    const endAdornment = (
        <Button
            aria-controls={props.id ?? String(props.name)}
            aria-label={t(isVisible ? 'hide' : 'show')}
            aria-pressed={isVisible}
            className="flowiy-auth-password-toggle"
            disabled={props.disabled}
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => setIsVisible((visible) => !visible)}
        >
            {isVisible ? <Eye aria-hidden="true" className="size-4" /> : <EyeOff aria-hidden="true" className="size-4" />}
        </Button>
    );

    return (
        <InputField
            {...props}
            kind={isVisible ? 'text' : 'password'}
            startAdornment={startAdornment}
            endAdornment={endAdornment}
        />
    );
}
