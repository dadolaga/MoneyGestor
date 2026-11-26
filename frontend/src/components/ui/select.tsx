'use client';

import * as React from 'react';

import { useTranslations } from 'next-intl';

import { Check, ChevronDown } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';

export interface SelectOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
    disabled?: boolean;
}

interface SelectProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange' | 'defaultValue' | 'onBlur'> {
    value?: string | number;
    defaultValue?: string | number;
    name?: string;
    disabled?: boolean;
    required?: boolean;
    autoFocus?: boolean;
    onBlur?: () => void;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    searchable?: boolean;
    options?: SelectOption[];
}

// Existing callers can keep their plain option children.
function readOptions(children: React.ReactNode): SelectOption[] {
    return React.Children.toArray(children).flatMap((child) => {
        if (!React.isValidElement<React.ComponentProps<'option'>>(child) || child.type !== 'option') return [];
        const label = React.Children.toArray(child.props.children).join('');
        return [{
            value: String(child.props.value ?? label),
            label: child.props.label ?? label,
            disabled: child.props.disabled,
        }];
    });
}

function OptionIcon({ children, selected = false }: { children: React.ReactNode; selected?: boolean }) {
    return (
        <span aria-hidden="true" className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4',
            selected && 'bg-primary/20 text-primary',
        )}>
            {children}
        </span>
    );
}

const Select = React.forwardRef<HTMLInputElement | HTMLButtonElement, SelectProps>(
    ({ className, children, options: providedOptions, value, defaultValue, onValueChange, onBlur, onKeyDown,
        placeholder, searchable = false, disabled, required, autoFocus, name, style, id: providedId, ...props }, ref) => {
        const t = useTranslations('Common.select');
        const isMobile = useIsMobile();
        const mobileSearch = !!(searchable && isMobile);
        const generatedId = React.useId();
        const id = providedId ?? generatedId;
        const listId = `${id}-options`;
        const popupId = mobileSearch ? `${listId}-popup` : listId;
        const mobileListProps = mobileSearch ? {
            id: listId,
            role: 'listbox' as const,
            'aria-label': props['aria-label'] ?? placeholder ?? t('search'),
        } : { className: 'contents' };
        const [internalValue, setInternalValue] = React.useState(String(defaultValue ?? ''));
        const [open, setOpen] = React.useState(false);
        const [query, setQuery] = React.useState<string | null>(null);
        const [activeValue, setActiveValue] = React.useState<string>();
        const anchorRef = React.useRef<HTMLDivElement>(null);
        const triggerRef = React.useRef<HTMLInputElement | HTMLButtonElement>(null);
        const listRef = React.useRef<HTMLDivElement>(null);
        const typeaheadRef = React.useRef({ text: '', time: 0 });
        const options = providedOptions ?? readOptions(children);
        const selectedValue = String(value ?? internalValue);
        const selected = options.find((option) => option.value === selectedValue);
        const filteredOptions = options.filter((option) => option.label.toLocaleLowerCase().includes((query ?? '').trim().toLocaleLowerCase()));
        const enabledOptions = filteredOptions.filter((option) => !option.disabled);
        const active = enabledOptions.find((option) => option.value === activeValue) ?? enabledOptions[0];
        const activeOptionId = open && active ? `${listId}-${options.indexOf(active)}` : undefined;

        React.useImperativeHandle(ref, () => triggerRef.current!);

        React.useEffect(() => {
            if (open) listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
        }, [open, active?.value]);

        function openChangeHandler(nextOpen: boolean) {
            setOpen(nextOpen);
            if (!nextOpen) setQuery(null);
            setActiveValue(selectedValue);
        }

        function selectHandler(option: SelectOption) {
            if (option.disabled || triggerRef.current?.matches(':disabled')) return;
            setInternalValue(option.value);
            onValueChange?.(option.value);
            openChangeHandler(false);
            triggerRef.current?.focus();
        }

        function keyDownHandler(event: React.KeyboardEvent<HTMLElement>) {
            onKeyDown?.(event);
            if (event.defaultPrevented || event.nativeEvent.isComposing) return;
            if (event.key === 'Escape' && open) {
                event.preventDefault();
                event.stopPropagation();
                openChangeHandler(false);
            } else if (event.key === 'Tab') {
                openChangeHandler(false);
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                if (!open) openChangeHandler(true);
                else {
                    const index = enabledOptions.findIndex((option) => option.value === active?.value);
                    const nextIndex = Math.max(0, Math.min(enabledOptions.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
                    setActiveValue(enabledOptions[nextIndex]?.value);
                }
            } else if (open && (event.key === 'Home' || event.key === 'End') && (!searchable || event.ctrlKey)) {
                event.preventDefault();
                setActiveValue((event.key === 'Home' ? enabledOptions[0] : enabledOptions.at(-1))?.value);
            } else if (event.key === 'Enter' || (!searchable && event.key === ' ')) {
                event.preventDefault();
                if (!open) openChangeHandler(true);
                else if (active) selectHandler(active);
            } else if (!searchable && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                const now = event.timeStamp;
                const text = (now - typeaheadRef.current.time < 600 ? typeaheadRef.current.text : '') + event.key.toLocaleLowerCase();
                typeaheadRef.current = { text, time: now };
                const match = enabledOptions.find((option) => option.label.toLocaleLowerCase().startsWith(text));
                if (!open) openChangeHandler(true);
                if (match) setActiveValue(match.value);
            }
        }

        const controlProps = {
            ...props,
            id,
            disabled,
            autoFocus,
            role: mobileSearch ? undefined : 'combobox',
            'aria-haspopup': mobileSearch ? 'dialog' as const : 'listbox' as const,
            'aria-expanded': open,
            'aria-controls': popupId,
            'aria-required': required ?? props['aria-required'],
            'aria-activedescendant': mobileSearch ? undefined : activeOptionId,
            className: cn(
                'min-w-0 flex-1 self-stretch border-0 bg-transparent p-0 text-left text-[inherit] font-[inherit] text-inherit outline-none placeholder:text-muted-foreground',
                searchable && !mobileSearch ? 'cursor-text' : 'cursor-pointer',
            ),
            onKeyDown: keyDownHandler,
            onBlur: (event: React.FocusEvent<HTMLElement>) => {
                if (!listRef.current?.contains(event.relatedTarget)) openChangeHandler(false);
                onBlur?.();
            },
            ref: (element: HTMLInputElement | HTMLButtonElement | null) => { triggerRef.current = element; },
        };

        return (
            <Popover open={open} onOpenChange={openChangeHandler} anchorRef={anchorRef}>
                <div
                    ref={anchorRef}
                    data-slot="select"
                    data-state={open ? 'open' : 'closed'}
                    className={cn(
                        'box-border flex h-10 w-full min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-solid border-input bg-background px-3 text-sm text-foreground transition-shadow',
                        'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/20',
                        'has-[:disabled]:cursor-not-allowed',
                        className,
                    )}
                    style={style}
                    onMouseDown={(event) => {
                        if (event.target instanceof Node && !triggerRef.current?.contains(event.target)) event.preventDefault();
                    }}
                    onClick={(event) => {
                        const trigger = triggerRef.current;
                        if (!trigger || trigger.matches(':disabled') || (event.target instanceof Node && trigger.contains(event.target))) return;
                        trigger.focus();
                        openChangeHandler(!open);
                    }}
                >
                    {name !== undefined && <input type="hidden" name={name} value={selectedValue} disabled={disabled} />}
                    {selected?.icon !== undefined && <OptionIcon selected>{selected.icon}</OptionIcon>}
                    <PopoverTrigger asChild>
                        {searchable && !mobileSearch ? (
                            <input
                                {...controlProps}
                                type="text"
                                autoComplete="off"
                                aria-autocomplete="list"
                                placeholder={selected?.label ?? placeholder ?? t('search')}
                                value={query ?? selected?.label ?? ''}
                                onFocus={(event) => {
                                    props.onFocus?.(event);
                                    if (query === null) event.currentTarget.select();
                                }}
                                onClick={(event) => {
                                    // Keep typing in the upper field while its list stays open.
                                    event.preventDefault();
                                    if (!open) openChangeHandler(true);
                                    if (query === null) event.currentTarget.select();
                                }}
                                onChange={(event) => {
                                    if (!open) openChangeHandler(true);
                                    setQuery(event.target.value);
                                    setActiveValue(undefined);
                                }}
                            />
                        ) : (
                            <button {...controlProps} type="button">
                                <span className={cn('block truncate', !selected && 'text-muted-foreground')}>
                                    {selected?.label ?? placeholder}
                                </span>
                            </button>
                        )}
                    </PopoverTrigger>
                    <ChevronDown
                        aria-hidden="true"
                        className={cn('pointer-events-none size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180 text-primary')}
                    />
                </div>
                <PopoverContent
                    ref={listRef}
                    id={popupId}
                    role={mobileSearch ? 'dialog' : 'listbox'}
                    aria-label={props['aria-label'] ?? selected?.label ?? placeholder}
                    align="start"
                    matchTriggerWidth
                    revealFromInput
                    mobileBottom={mobileSearch}
                    maxHeight={mobileSearch ? 384 : 288}
                    focusOnOpen={mobileSearch}
                    className={cn(
                        'max-h-72 rounded-xl border border-solid border-border p-1.5 shadow-lg [scrollbar-color:var(--primary)_transparent] [scrollbar-width:thin]',
                        mobileSearch && 'rounded-2xl pb-[max(0.375rem,env(safe-area-inset-bottom))]',
                    )}
                    onKeyDown={keyDownHandler}
                >
                    {!!mobileSearch && (
                        <div className="sticky top-0 z-10 bg-popover pb-2">
                            <Input
                                type="search"
                                role="combobox"
                                aria-label={props['aria-label'] ?? placeholder ?? t('search')}
                                aria-autocomplete="list"
                                aria-expanded={open}
                                aria-controls={listId}
                                aria-activedescendant={activeOptionId}
                                autoComplete="off"
                                placeholder={t('search')}
                                value={query ?? ''}
                                className="text-base"
                                onChange={(event) => {
                                    setQuery(event.target.value);
                                    setActiveValue(undefined);
                                }}
                            />
                        </div>
                    )}
                    <div {...mobileListProps}>
                        {filteredOptions.map((option) => (
                            <div
                                key={option.value}
                                id={`${listId}-${options.indexOf(option)}`}
                                role="option"
                                aria-selected={option.value === selectedValue}
                                aria-disabled={!!option.disabled}
                                data-active={option.value === active?.value}
                                className={cn(
                                    'flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-popover-foreground',
                                    'data-[active=true]:bg-muted hover:bg-muted',
                                    'aria-selected:bg-primary/15 aria-selected:hover:bg-primary/15 aria-selected:data-[active=true]:bg-primary/15',
                                    'aria-disabled:cursor-not-allowed',
                                )}
                                onPointerMove={() => { if (!option.disabled) setActiveValue(option.value); }}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => selectHandler(option)}
                            >
                                {option.icon !== undefined && <OptionIcon selected={option.value === selectedValue}>{option.icon}</OptionIcon>}
                                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                                {option.value === selectedValue && <Check aria-hidden="true" className="size-4 shrink-0 text-primary" />}
                            </div>
                        ))}
                        {filteredOptions.length === 0 && <p role="status" className="m-0 px-3 py-3 text-sm text-muted-foreground">{t('noResults')}</p>}
                    </div>
                </PopoverContent>
            </Popover>
        );
    },
);
Select.displayName = 'Select';

export { Select };
