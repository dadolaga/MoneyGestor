'use client';

import { useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';

import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { Controller } from 'react-hook-form';
import type { UseControllerProps } from 'react-hook-form';

import { FormField, fieldAriaProps } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Check, ChevronDown, ChevronRight, Ellipsis, Plus, Search } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCalendarDateFormatting } from '@/hooks/useCalendarDateFormatting';
import { cn } from '@/lib/utils';

import type { TransactionFormValues } from './transaction-editor-model';

function MobileFieldSheet({
    open,
    onOpenChange,
    title,
    children,
    footer,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
}) {
    const t = useTranslations('Movements.dialog');
    const [drag, setDrag] = useState({ active: false, offset: 0 });
    const dragStart = useRef<{ pointerId: number; y: number; threshold: number } | null>(null);

    function resetDragHandler() {
        dragStart.current = null;
        setDrag({ active: false, offset: 0 });
    }

    function pointerDownHandler(event: PointerEvent<HTMLDivElement>) {
        if (!open || !event.isPrimary || event.button !== 0 || !window.matchMedia('(max-width: 639px)').matches) return;
        const sheet = event.currentTarget.closest('dialog');
        if (!sheet) return;
        event.preventDefault();
        dragStart.current = { pointerId: event.pointerId, y: event.clientY, threshold: Math.min(96, sheet.offsetHeight / 4) };
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag({ active: true, offset: 0 });
    }

    function pointerMoveHandler(event: PointerEvent<HTMLDivElement>) {
        const start = dragStart.current;
        if (start?.pointerId !== event.pointerId) return;
        setDrag({ active: true, offset: Math.max(0, event.clientY - start.y) });
    }

    function pointerUpHandler(event: PointerEvent<HTMLDivElement>) {
        const start = dragStart.current;
        if (start?.pointerId !== event.pointerId) return;
        const offset = Math.max(0, event.clientY - start.y);
        const dismiss = offset >= start.threshold;
        dragStart.current = null;
        setDrag({ active: false, offset: dismiss ? offset : 0 });
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (dismiss) onOpenChange(false);
    }

    function pointerCancelHandler(event: PointerEvent<HTMLDivElement>) {
        if (dragStart.current?.pointerId === event.pointerId) resetDragHandler();
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                data-mobile-field-sheet="true"
                data-dragging={drag.active || undefined}
                style={{ translate: `0 ${drag.offset}px` }}
                onExitComplete={resetDragHandler}
                closeLabel={t('cancel')}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault();
                }}
                className="max-h-[85dvh] gap-0 overflow-hidden rounded-t-3xl border border-solid border-border bg-popover p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-popover-foreground [&_*]:box-border"
            >
                <div
                    className="touch-none select-none cursor-grab active:cursor-grabbing"
                    onPointerDown={pointerDownHandler}
                    onPointerMove={pointerMoveHandler}
                    onPointerUp={pointerUpHandler}
                    onPointerCancel={pointerCancelHandler}
                    onLostPointerCapture={pointerCancelHandler}
                >
                    <span
                        aria-hidden="true"
                        className="mx-auto mb-3 block h-1 w-12 rounded-full bg-muted-foreground/50"
                    />
                    <SheetHeader className="mb-4 pr-8 text-left">
                        <SheetTitle
                            ref={(element) => {
                                // Native autofocus lets showModal focus the title before any input.
                                element?.setAttribute('autofocus', '');
                            }}
                            tabIndex={-1}
                            className="outline-none"
                        >
                            {title}
                        </SheetTitle>
                        <SheetDescription className="sr-only">{title}</SheetDescription>
                    </SheetHeader>
                </div>
                <div className="grid min-h-0 gap-3 overflow-y-auto overscroll-contain">{children}</div>
                {!!footer && <div className="shrink-0 pt-3">{footer}</div>}
            </SheetContent>
        </Sheet>
    );
}

interface ChoiceOption {
    value: string;
    label: string;
    icon: ReactNode;
    detail?: string;
}

type ChoiceName = 'walletId' | 'destinationWalletId' | 'typeId';

export function TransactionMobileChoiceField({
    id,
    label,
    title,
    placeholder,
    options,
    categories = false,
    onAddCategory,
    ...controllerProps
}: UseControllerProps<TransactionFormValues, ChoiceName> & {
    id: string;
    label: string;
    title: string;
    placeholder: string;
    options: ChoiceOption[];
    categories?: boolean;
    onAddCategory?: () => void;
}) {
    const t = useTranslations('Movements.mobile');
    const tCategory = useTranslations('Movements.categoryEditor');
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    return (
        <Controller
            {...controllerProps}
            render={({ field, fieldState }) => {
                const selected = options.find((option) => option.value === field.value);
                const shortcuts = options.slice(0, 4);
                if (selected && !shortcuts.includes(selected)) shortcuts.splice(3, 1, selected);
                const filtered = options.filter((option) =>
                    option.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
                );
                const selectHandler = (value: string) => {
                    field.onChange(value);
                    field.onBlur();
                    setOpen(false);
                };
                const openHandler = () => {
                    setSearch('');
                    setOpen(true);
                };

                function optionButton(option: ChoiceOption, compact = false) {
                    const active = option.value === field.value;
                    return (
                        <Button
                            key={option.value}
                            type="button"
                            variant="transparent"
                            aria-pressed={active}
                            title={option.label}
                            onClick={() => selectHandler(option.value)}
                            className={cn(
                                'h-auto min-h-14 min-w-0 gap-3 rounded-xl border border-solid border-border bg-background px-3 py-3',
                                categories
                                    ? 'flex-col justify-center gap-2 px-1 [&>span:first-child]:size-7'
                                    : 'justify-start',
                                compact && 'min-h-20',
                                active && 'border-primary bg-primary/10 ring-1 ring-primary',
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className="flex size-7 shrink-0 items-center justify-center [&>span]:size-full"
                            >
                                {option.icon}
                            </span>
                            <span className={cn('min-w-0 truncate', categories ? 'w-full text-xs' : 'text-sm')}>
                                {option.label}
                            </span>
                            {!categories && (
                                <span className="ml-auto shrink-0 text-sm tabular-nums">{option.detail}</span>
                            )}
                            {!categories && (
                                <span
                                    className={cn(
                                        'flex size-5 shrink-0 items-center justify-center rounded-full border border-solid',
                                        active
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-muted-foreground',
                                    )}
                                >
                                    {!!active && <Check aria-hidden="true" className="size-3" />}
                                </span>
                            )}
                        </Button>
                    );
                }

                return (
                    <FormField id={id} label={label} error={fieldState.error?.message}>
                        {categories ? (
                            <>
                                <Button
                                    ref={field.ref}
                                    id={id}
                                    type="button"
                                    variant="transparent"
                                    size="sm"
                                    className="-mt-8 ml-auto h-6 px-0 text-xs"
                                    aria-haspopup="dialog"
                                    {...fieldAriaProps(id, fieldState.error?.message)}
                                    onClick={openHandler}
                                >
                                    {t('viewAll')}
                                    <ChevronRight aria-hidden="true" className="size-4" />
                                </Button>
                                <div role="group" aria-label={label} className="grid grid-cols-5 gap-2">
                                    {shortcuts.map((option) => optionButton(option, true))}
                                    <Button
                                        type="button"
                                        variant="transparent"
                                        onClick={openHandler}
                                        aria-haspopup="dialog"
                                        className="h-auto min-h-20 min-w-0 flex-col gap-2 rounded-xl border border-solid border-border bg-background px-1 text-xs"
                                    >
                                        <Ellipsis aria-hidden="true" className="size-7" />
                                        {t('more')}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <Button
                                ref={field.ref}
                                id={id}
                                type="button"
                                variant="outline"
                                aria-haspopup="dialog"
                                className="h-12 w-full justify-start rounded-xl border border-solid border-input text-base"
                                {...fieldAriaProps(id, fieldState.error?.message)}
                                onClick={openHandler}
                            >
                                {!!selected && (
                                    <span aria-hidden="true" className="flex size-5 shrink-0 [&>span]:size-full">
                                        {selected.icon}
                                    </span>
                                )}
                                <span className="truncate">{selected?.label ?? placeholder}</span>
                                <ChevronDown aria-hidden="true" className="ml-auto size-5" />
                            </Button>
                        )}
                        <MobileFieldSheet
                            open={open}
                            title={title}
                            onOpenChange={(nextOpen) => {
                                setOpen(nextOpen);
                                if (!nextOpen) field.onBlur();
                            }}
                            footer={
                                <div className="relative">
                                    <Search
                                        aria-hidden="true"
                                        className="absolute left-3 top-3 size-4 text-muted-foreground"
                                    />
                                    <Input
                                        aria-label={t(categories ? 'searchCategory' : 'searchWallet')}
                                        placeholder={t(categories ? 'searchCategory' : 'searchWallet')}
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        className="pl-10 text-base"
                                    />
                                </div>
                            }
                        >
                            <div className={cn('grid gap-2', categories && 'grid-cols-4')}>
                                {filtered.map((option) => optionButton(option))}
                            </div>
                            {filtered.length === 0 && (
                                <p role="status" className="m-0 text-sm text-muted-foreground">
                                    {t('noResults')}
                                </p>
                            )}
                            {!!onAddCategory && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-11"
                                    onClick={() => {
                                        setOpen(false);
                                        onAddCategory();
                                    }}
                                >
                                    <Plus aria-hidden="true" className="size-4" />
                                    {tCategory('title')}
                                </Button>
                            )}
                        </MobileFieldSheet>
                    </FormField>
                );
            }}
        />
    );
}

export function TransactionMobileDateField({
    id,
    label,
    ...controllerProps
}: UseControllerProps<TransactionFormValues, 'date'> & { id: string; label: string }) {
    const t = useTranslations('Movements.mobile');
    const tDialog = useTranslations('Movements.dialog');
    const { formatDate, formatMonth, formatWeekday } = useCalendarDateFormatting();
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<Date>();
    const [month, setMonth] = useState<Date>();

    return (
        <Controller
            {...controllerProps}
            render={({ field, fieldState }) => {
                const displayDate = dayjs(field.value).isValid()
                    ? formatDate(dayjs(field.value).toDate())
                    : tDialog('datePlaceholder');
                return (
                    <FormField id={id} label={label} error={fieldState.error?.message}>
                        <Button
                            ref={field.ref}
                            id={id}
                            type="button"
                            variant="outline"
                            aria-haspopup="dialog"
                            className="h-12 w-full justify-start rounded-xl border border-solid border-input text-base"
                            {...fieldAriaProps(id, fieldState.error?.message)}
                            onClick={() => {
                                const date = dayjs(field.value).isValid()
                                    ? dayjs(field.value).toDate()
                                    : dayjs().toDate();
                                setDraft(date);
                                setMonth(date);
                                setOpen(true);
                            }}
                        >
                            <CalendarIcon aria-hidden="true" className="size-5" />
                            {displayDate}
                            <ChevronRight aria-hidden="true" className="ml-auto size-5" />
                        </Button>
                        <MobileFieldSheet
                            open={open}
                            title={t('selectDate')}
                            onOpenChange={(nextOpen) => {
                                setOpen(nextOpen);
                                if (!nextOpen) field.onBlur();
                            }}
                        >
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { offset: 0, label: tDialog('today') },
                                    { offset: 1, label: t('yesterday') },
                                ].map(({ offset, label: shortcutLabel }) => (
                                    <Button
                                        key={offset}
                                        type="button"
                                        variant={
                                            dayjs(draft).isSame(dayjs().subtract(offset, 'day'), 'day')
                                                ? 'default'
                                                : 'outline'
                                        }
                                        onClick={() => {
                                            const date = dayjs().subtract(offset, 'day').startOf('day').toDate();
                                            setDraft(date);
                                            setMonth(date);
                                        }}
                                    >
                                        <CalendarIcon aria-hidden="true" className="size-4" />
                                        {shortcutLabel}
                                    </Button>
                                ))}
                            </div>
                            <Calendar
                                appearance="spacious"
                                mode="single"
                                selected={draft}
                                month={month}
                                onMonthChange={setMonth}
                                onSelect={(date) => {
                                    if (date) setDraft(date);
                                }}
                                className="w-full p-0"
                                classNames={{
                                    month: 'w-full space-y-2',
                                    nav: 'absolute inset-x-0 top-0 z-10 flex justify-between',
                                    weekdays: 'grid grid-cols-7',
                                    weekday: 'text-xs text-muted-foreground',
                                    week: 'mt-1 grid grid-cols-7',
                                    day: 'min-w-0 text-center text-sm',
                                    day_button:
                                        'size-9 max-w-full rounded-full border-0 bg-transparent text-sm text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                                }}
                                formatters={{
                                    formatCaption: formatMonth,
                                    formatWeekdayName: formatWeekday,
                                }}
                                labels={{
                                    labelDayButton: formatDate,
                                    labelPrevious: () => tDialog('previousMonth'),
                                    labelNext: () => tDialog('nextMonth'),
                                }}
                            />
                            <Button
                                type="button"
                                disabled={!draft}
                                className="h-12 rounded-xl text-base"
                                onClick={() => {
                                    field.onChange(dayjs(draft).format('YYYY-MM-DD'));
                                    field.onBlur();
                                    setOpen(false);
                                }}
                            >
                                {t('confirmDate')}
                                <ChevronRight aria-hidden="true" className="size-5" />
                            </Button>
                        </MobileFieldSheet>
                    </FormField>
                );
            }}
        />
    );
}
