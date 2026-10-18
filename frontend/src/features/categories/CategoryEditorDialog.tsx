'use client';

import { useId, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { InputField, SwitchField } from '@/components/shared/form-controls';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tag } from '@/components/ui/icons';
import { ApiProblemError, apiClient } from '@/lib/api/client';
import type { ApiTransactionType } from '@/lib/api/client';

import { categoryIcons, categoryColors, CategoryIcon } from './category-display';

interface CategoryFormValues {
    name: string;
    parentId: string;
    icon: string;
    color: string;
    description: string;
    keywords: string;
    useInReports: boolean;
}

interface CategoryEditorDialogProps {
    types: ApiTransactionType[];
    loading: boolean;
    error: string;
    onRetry: () => void;
    onClose: () => void;
    onCreated: (category: ApiTransactionType) => void;
}

export function CategoryEditorDialog({ types, loading, error, onRetry, onClose, onCreated }: CategoryEditorDialogProps) {
    const t = useTranslations('Movements.categoryEditor');
    const id = useId();
    const [createdId, setCreatedId] = useState<number>();
    const {
        control,
        register,
        handleSubmit,
        clearErrors,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<CategoryFormValues>({
        mode: 'onBlur',
        defaultValues: {
            name: '',
            parentId: '',
            icon: 'shopping',
            color: 'red',
            description: '',
            keywords: '',
            useInReports: true,
        },
    });
    const categories = types.filter((type) => type.systemKind === null);

    async function submitHandler(values: CategoryFormValues) {
        clearErrors('root');
        const name = values.name.trim();
        let category: ApiTransactionType;
        try {
            let id = createdId;
            if (id === undefined) {
                const result = await apiClient.createTransactionType({
                    name, parentId: values.parentId ? Number(values.parentId) : null,
                    icon: values.icon, color: values.color, description: values.description.trim() || null,
                    keywords: values.keywords.trim() || null, useInReports: values.useInReports,
                });
                id = result.id;
                setCreatedId(id);
            }
            category = await apiClient.transactionType(id);
        } catch (cause: unknown) {
            if (cause instanceof ApiProblemError) {
                if (cause.status === 409) {
                    setError('name', { message: t('duplicateName') }, { shouldFocus: true });
                    return;
                }
                const fields: Record<string, keyof CategoryFormValues> = {
                    name: 'name', parentid: 'parentId', icon: 'icon', color: 'color',
                    description: 'description', keywords: 'keywords', useinreports: 'useInReports',
                };
                for (const field of Object.keys(cause.fieldErrors)) {
                    const name = fields[field.split('.').at(-1)?.toLowerCase() ?? ''];
                    if (name) setError(name, { message: t('invalidField') });
                }
            }
            setError('root.server', {
                message: t(cause instanceof ApiProblemError && cause.status === 401 ? 'signInAgain' : 'saveFailed'),
            });
            return;
        }
        onCreated(category);
    }

    return (
        <Dialog
            open
            dismissOnOutside={false}
            onOpenChange={(open) => {
                if (!open && !isSubmitting) onClose();
            }}
        >
            <DialogContent
                closeLabel={t('cancel')}
                className="box-border max-w-[780px] gap-0 border border-solid border-border p-0 shadow-none [&_*]:box-border"
            >
                <DialogHeader className="flex-row items-center gap-4 space-y-0 px-5 pt-5 pr-12 text-left sm:px-7 sm:pt-6">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground sm:size-16">
                        <Tag aria-hidden="true" className="size-7" />
                    </span>
                    <div>
                        <DialogTitle className="m-0 text-2xl font-semibold">{t('title')}</DialogTitle>
                        <DialogDescription className="mt-1 text-sm">{t('subtitle')}</DialogDescription>
                    </div>
                </DialogHeader>
                <form
                    className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    noValidate
                    onSubmit={handleSubmit(submitHandler)}
                >
                    <DialogBody className="px-5 py-5 sm:px-7">
                        <fieldset disabled={isSubmitting || loading || createdId !== undefined} className="m-0 grid min-w-0 gap-4 border-0 p-0">
                            <div className="grid min-w-0 items-start gap-4 sm:grid-cols-2">
                                <InputField
                                    control={control}
                                    name="name"
                                    id={`${id}-name`}
                                    label={
                                        <>
                                            {t('name')} <span aria-hidden="true" className="text-primary">*</span>
                                        </>
                                    }
                                    placeholder={t('namePlaceholder')}
                                    maxLength={100}
                                    aria-required
                                    rules={{
                                        validate: (value) =>
                                            (typeof value === 'string' && value.trim().length > 0) || t('required'),
                                        maxLength: { value: 100, message: t('invalidName') },
                                    }}
                                />
                                <InputField
                                    control={control}
                                    name="parentId"
                                    id={`${id}-parent`}
                                    kind="select"
                                    searchable
                                    label={t('parent')}
                                    options={[
                                        { value: '', label: t('noParent') },
                                        ...categories.map((category) => ({
                                            value: String(category.id),
                                            label: category.name,
                                            icon: <CategoryIcon type={category} />,
                                        })),
                                    ]}
                                />
                                <InputField
                                    control={control}
                                    name="icon"
                                    id={`${id}-icon`}
                                    kind="select"
                                    label={t('icon')}
                                    options={Object.entries(categoryIcons).map(([value, Icon]) => ({
                                        value,
                                        label: t(`icons.${value}`),
                                        icon: <Icon />,
                                    }))}
                                />
                                <fieldset className="m-0 min-w-0 border-0 p-0">
                                    <legend className="mb-2 p-0 text-sm font-medium">{t('color')}</legend>
                                    <div className="flex min-h-10 flex-wrap items-center gap-3 px-1">
                                        {Object.entries(categoryColors).map(([name, value]) => (
                                            <label key={name} className="relative inline-flex cursor-pointer">
                                                <input
                                                    {...register('color')}
                                                    type="radio"
                                                    value={name}
                                                    aria-label={t(`colors.${name}`)}
                                                    className="peer sr-only"
                                                />
                                                <span
                                                    className="size-7 rounded-full border-2 border-solid border-transparent ring-offset-4 ring-offset-popover peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring"
                                                    style={{ backgroundColor: value }}
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                            </div>
                            <InputField
                                control={control}
                                name="description"
                                id={`${id}-description`}
                                label={t('description')}
                                placeholder={t('descriptionPlaceholder')}
                                maxLength={500}
                            />
                            <InputField
                                control={control}
                                name="keywords"
                                id={`${id}-keywords`}
                                label={t('keywords')}
                                placeholder={t('keywordsPlaceholder')}
                                maxLength={1000}
                            />
                            <SwitchField
                                control={control}
                                name="useInReports"
                                id={`${id}-reports`}
                                label={t('useInReports')}
                                description={t('reportsHint')}
                            />
                            {!!errors.root?.server?.message && (
                                <p role="alert" className="m-0 text-sm text-destructive">
                                    {errors.root.server.message}
                                </p>
                            )}
                        </fieldset>
                        {!!loading && (
                            <p role="status" className="m-0 mt-4 text-sm text-muted-foreground">{t('loading')}</p>
                        )}
                        {!!error && (
                            <div role="alert" className="mt-4 flex items-center justify-between gap-3 text-sm text-destructive">
                                <span>{error}</span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isSubmitting || loading}
                                    onClick={onRetry}
                                >
                                    {t('retry')}
                                </Button>
                            </div>
                        )}
                    </DialogBody>
                    <DialogFooter className="mx-5 items-stretch border-t border-border py-3 sm:mx-7 sm:items-center">
                        <Button
                            type="button"
                            variant="transparent"
                            className="sm:mr-auto"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={isSubmitting || loading || !!error}>
                            {t(isSubmitting ? 'saving' : createdId !== undefined ? 'retry' : 'create')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
