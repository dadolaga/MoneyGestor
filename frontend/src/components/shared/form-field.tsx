import type { ReactNode } from 'react';

import { Label } from '@/components/ui/label';

interface FormFieldProps {
    id: string;
    label: string;
    error?: string;
    description?: string;
    children: ReactNode;
}

export function FormField({ id, label, error, description, children }: FormFieldProps) {
    const descriptionId = description ? `${id}-description` : undefined;
    const errorId = error ? `${id}-error` : undefined;

    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {description ? (
                <p id={descriptionId} className="m-0 text-sm text-muted-foreground">
                    {description}
                </p>
            ) : null}
            {error ? (
                <p id={errorId} role="alert" className="m-0 text-sm text-destructive">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

export function fieldAriaProps(id: string, error?: string, description?: string) {
    return {
        'aria-invalid': Boolean(error),
        'aria-describedby':
            [description ? `${id}-description` : undefined, error ? `${id}-error` : undefined]
                .filter(Boolean)
                .join(' ') || undefined,
    };
}
