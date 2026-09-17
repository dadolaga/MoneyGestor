'use client';

import { useEffect, useMemo, useState } from 'react';

import dayjs from 'dayjs';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowDown,
    ArrowDownLeft,
    ArrowLeftRight,
    ArrowUp,
    ArrowUpDown,
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    CircleDollarSign,
    EllipsisVertical,
    Plus,
    RotateCcw,
    Search,
    Tag,
    WalletCards,
} from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';

import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { DateRangeField, type DayjsDateRange } from '@/components/shared/date-range-field';
import { FeatureStateBoundary } from '@/components/shared/feature-state';
import { InputField } from '@/components/shared/form-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { FeatureState } from '@/types/feature-state';

import type { TransactionViewModel } from './model';

type TransactionKind = 'income' | 'expense' | 'transfer';
type SortKey = 'date' | 'description' | 'kind' | 'category' | 'wallet' | 'amount';
type SortDirection = 'ascending' | 'descending';

interface SortState {
    key: SortKey;
    direction: SortDirection;
}

interface TransactionsPageProps {
    initialState: FeatureState<TransactionViewModel[]>;
}

interface TransactionFormValues {
    description: string;
    amount: number | string;
    date: string;
    kind: TransactionKind;
    category: string;
    wallet: string;
    destinationWallet: string;
}

function transactionKind(transaction: TransactionViewModel): TransactionKind {
    if (transaction.isTransfer) return 'transfer';
    return transaction.value >= 0 ? 'income' : 'expense';
}

function KindBadge({ kind, label }: { kind: TransactionKind; label: string }) {
    const Icon = kind === 'income' ? ArrowDownLeft : kind === 'expense' ? ArrowUpRight : ArrowLeftRight;
    return (
        <Badge className="min-w-24 justify-center gap-1.5" variant={kind}>
            <Icon aria-hidden="true" className="size-3.5" />
            {label}
        </Badge>
    );
}

function SummaryCard({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    tone: string;
}) {
    return (
        <Card className="min-w-0 shadow-none">
            <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-full', tone)}>
                    <Icon aria-hidden="true" className="size-6" />
                </span>
                <div className="min-w-0">
                    <p className="m-0 truncate text-sm text-muted-foreground">{label}</p>
                    <p className="m-0 mt-1 truncate text-2xl font-semibold tabular-nums">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function SortableTableHead({
    column,
    label,
    sort,
    align = 'left',
    onSort,
}: {
    column: SortKey;
    label: string;
    sort: SortState;
    align?: 'left' | 'right';
    onSort: (column: SortKey) => void;
}) {
    const active = sort.key === column;
    const Icon = active ? (sort.direction === 'ascending' ? ArrowUp : ArrowDown) : ArrowUpDown;
    const alignmentClassName = align === 'right' ? 'text-right' : '';

    return (
        <TableHead aria-sort={active ? sort.direction : 'none'} className={alignmentClassName}>
            <button
                type="button"
                className={cn(
                    'inline-flex w-full cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 font-medium text-muted-foreground hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    align === 'right' && 'justify-end',
                )}
                onClick={() => onSort(column)}
            >
                {label}
                <Icon aria-hidden="true" className={cn('size-3.5', !active && 'opacity-45')} />
            </button>
        </TableHead>
    );
}

function TransactionDialog({
    open,
    transaction,
    wallets,
    onOpenChange,
    onSave,
}: {
    open: boolean;
    transaction?: TransactionViewModel;
    wallets: string[];
    onOpenChange: (open: boolean) => void;
    onSave: (transaction: Omit<TransactionViewModel, 'id'>) => void;
}) {
    const t = useTranslations('Movements');
    const locale = useLocale();
    const { control, handleSubmit, reset } = useForm<TransactionFormValues>();
    const kind = useWatch({ control, name: 'kind' });
    const sourceWallet = useWatch({ control, name: 'wallet' });

    useEffect(() => {
        const kindValue = transaction ? transactionKind(transaction) : 'expense';
        reset({
            description: transaction?.description ?? '',
            amount: Math.abs(transaction?.value ?? 0) || '',
            date: transaction?.date ? dayjs(transaction.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
            kind: kindValue,
            category: transaction?.typeName ?? '',
            wallet: transaction?.walletName ?? wallets[0] ?? '',
            destinationWallet: transaction?.destinationWalletName ?? wallets[1] ?? '',
        });
    }, [open, reset, transaction, wallets]);

    const submit = handleSubmit((values) => {
        const amount = Number(values.amount);
        const isTransfer = values.kind === 'transfer';
        onSave({
            description: values.description.trim(),
            date: `${values.date}T12:00:00Z`,
            typeName: isTransfer ? 'Transfer' : values.category.trim(),
            walletName: values.wallet,
            destinationWalletName: isTransfer ? values.destinationWallet : undefined,
            value: values.kind === 'income' ? Math.abs(amount) : -Math.abs(amount),
            isTransfer,
        });
        onOpenChange(false);
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent closeLabel={t('actions.cancel')}>
                <DialogHeader>
                    <DialogTitle>
                        {/* Both branches are translated strings; no nullable value can reach the tree. */}
                        {/* eslint-disable-next-line react/jsx-no-leaked-render */}
                        {transaction !== undefined ? t('dialog.editTitle') : t('dialog.createTitle')}
                    </DialogTitle>
                    <DialogDescription>
                        {/* eslint-disable-next-line react/jsx-no-leaked-render */}
                        {transaction !== undefined ? t('dialog.editDescription') : t('dialog.createDescription')}
                    </DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <form id="transaction-form" className="grid gap-4 py-1" onSubmit={submit}>
                        <InputField
                            control={control}
                            name="kind"
                            kind="select"
                            label={t('dialog.kind')}
                            options={(['expense', 'income', 'transfer'] as const).map((value) => ({
                                value,
                                label: t(`filters.${value}`),
                            }))}
                        />
                        <InputField
                            control={control}
                            name="description"
                            label={t('dialog.description')}
                            placeholder={t('dialog.descriptionPlaceholder')}
                            rules={{ required: t('dialog.required') }}
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <InputField
                                control={control}
                                name="amount"
                                kind="amount"
                                locale={locale}
                                label={t('dialog.amount')}
                                startAdornment="€"
                                rules={{
                                    required: t('dialog.required'),
                                    validate: (value) => Number(value) > 0 || t('dialog.invalidAmount'),
                                }}
                            />
                            <InputField
                                control={control}
                                name="date"
                                type="date"
                                label={t('dialog.date')}
                                rules={{ required: t('dialog.required') }}
                            />
                        </div>
                        {kind !== 'transfer' && (
                            <InputField
                                control={control}
                                name="category"
                                label={t('dialog.category')}
                                rules={{ required: t('dialog.required') }}
                            />
                        )}
                        <InputField
                            control={control}
                            name="wallet"
                            kind="select"
                            label={t('dialog.wallet')}
                            options={wallets.map((wallet) => ({ value: wallet, label: wallet }))}
                            rules={{ required: t('dialog.required') }}
                        />
                        {kind === 'transfer' && (
                            <InputField
                                control={control}
                                name="destinationWallet"
                                kind="select"
                                label={t('dialog.destinationWallet')}
                                options={wallets.map((wallet) => ({ value: wallet, label: wallet }))}
                                rules={{
                                    required: t('dialog.required'),
                                    validate: (value) => value !== sourceWallet || t('dialog.differentWallet'),
                                }}
                            />
                        )}
                    </form>
                </DialogBody>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        {t('actions.cancel')}
                    </Button>
                    <Button type="submit" form="transaction-form">
                        {t('actions.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function TransactionsPage({ initialState }: TransactionsPageProps) {
    const t = useTranslations('Movements');
    const format = useFormatter();
    const locale = useLocale();
    const [transactions, setTransactions] = useState(
        initialState.status === 'ready' ? initialState.data : ([] as TransactionViewModel[]),
    );
    const [query, setQuery] = useState('');
    const [walletFilter, setWalletFilter] = useState('all');
    const [kindFilter, setKindFilter] = useState('all');
    const [dateRange, setDateRange] = useState<DayjsDateRange>();
    const [sort, setSort] = useState<SortState>({ key: 'date', direction: 'descending' });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(8);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<TransactionViewModel>();
    const [deleting, setDeleting] = useState<TransactionViewModel>();

    const wallets = useMemo(
        () =>
            Array.from(
                new Set(
                    transactions
                        .flatMap((item) => [item.walletName, item.destinationWalletName])
                        .filter((value): value is string => Boolean(value)),
                ),
            ).sort(),
        [transactions],
    );

    const collator = useMemo(() => new Intl.Collator(locale, { numeric: true, sensitivity: 'base' }), [locale]);

    const filtered = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        return transactions
            .filter((transaction) => {
                const kind = transactionKind(transaction);
                const haystack = [
                    transaction.description,
                    transaction.typeName,
                    transaction.walletName,
                    String(Math.abs(transaction.value)),
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLocaleLowerCase();
                const date = transaction.date ? dayjs(transaction.date) : undefined;
                return (
                    (!normalizedQuery || haystack.includes(normalizedQuery)) &&
                    (walletFilter === 'all' ||
                        transaction.walletName === walletFilter ||
                        transaction.destinationWalletName === walletFilter) &&
                    (kindFilter === 'all' || kind === kindFilter) &&
                    (!dateRange?.start || (date !== undefined && !date.isBefore(dateRange.start, 'day'))) &&
                    (!dateRange?.end || (date !== undefined && !date.isAfter(dateRange.end, 'day')))
                );
            })
            .sort((a, b) => {
                let difference: number;

                switch (sort.key) {
                    case 'description':
                        difference = collator.compare(a.description ?? '', b.description ?? '');
                        break;
                    case 'kind':
                        difference = collator.compare(transactionKind(a), transactionKind(b));
                        break;
                    case 'category':
                        difference = collator.compare(a.typeName ?? '', b.typeName ?? '');
                        break;
                    case 'wallet':
                        difference = collator.compare(a.walletName ?? '', b.walletName ?? '');
                        break;
                    case 'amount':
                        difference = a.value - b.value;
                        break;
                    case 'date':
                    default:
                        difference = dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
                }

                if (difference === 0) difference = a.id - b.id;
                return sort.direction === 'ascending' ? difference : -difference;
            });
    }, [collator, dateRange, kindFilter, query, sort, transactions, walletFilter]);

    const totals = useMemo(() => {
        const ordinary = transactions.filter((transaction) => !transaction.isTransfer);
        return {
            income: ordinary.filter((item) => item.value > 0).reduce((sum, item) => sum + item.value, 0),
            expenses: Math.abs(ordinary.filter((item) => item.value < 0).reduce((sum, item) => sum + item.value, 0)),
            transfers: Math.abs(
                transactions.filter((item) => item.isTransfer).reduce((sum, item) => sum + item.value, 0),
            ),
            net: ordinary.reduce((sum, item) => sum + item.value, 0),
        };
    }, [transactions]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, pageCount);
    const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
    const money = (value: number) => format.number(value, { style: 'currency', currency: 'EUR' });
    const date = (value?: string) => (value ? format.dateTime(dayjs(value).toDate(), { dateStyle: 'medium' }) : '—');
    const kindLabel = (transaction: TransactionViewModel) => t(`filters.${transactionKind(transaction)}`);

    const resetFilters = () => {
        setQuery('');
        setWalletFilter('all');
        setKindFilter('all');
        setDateRange(undefined);
        setPage(1);
    };

    const toggleSort = (key: SortKey) => {
        setSort((current) => ({
            key,
            direction: current.key === key && current.direction === 'ascending' ? 'descending' : 'ascending',
        }));
        setPage(1);
    };

    const openCreate = () => {
        setEditing(undefined);
        setDialogOpen(true);
    };

    const openEdit = (transaction: TransactionViewModel) => {
        setEditing(transaction);
        setDialogOpen(true);
    };

    const save = (value: Omit<TransactionViewModel, 'id'>) => {
        if (editing) {
            setTransactions((current) =>
                current.map((item) => (item.id === editing.id ? { ...value, id: item.id } : item)),
            );
        } else {
            setTransactions((current) => [
                { ...value, id: Math.max(0, ...current.map((item) => item.id)) + 1 },
                ...current,
            ]);
        }
    };

    const states = {
        idle: t('states.idle'),
        loading: t('states.loading'),
        empty: t('states.empty'),
        error: t('states.error'),
    };

    if (initialState.status !== 'ready') {
        return (
            <FeatureStateBoundary state={initialState} labels={states}>
                {() => null}
            </FeatureStateBoundary>
        );
    }

    const rowActions = (transaction: TransactionViewModel) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t('actions.more', { name: transaction.description ?? t('list.untitled') })}
                >
                    <EllipsisVertical aria-hidden="true" className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => openEdit(transaction)}>{t('actions.edit')}</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onSelect={() => setDeleting(transaction)}>
                    {t('actions.delete')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <div className="mx-auto grid w-full max-w-[96rem] gap-4 lg:h-full lg:min-h-0 lg:grid-rows-[auto_auto_auto_minmax(0,1fr)] lg:overflow-hidden">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="m-0 text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
                    <p className="m-0 mt-1 text-muted-foreground">{t('description')}</p>
                </div>
                <Button className="w-full sm:w-auto" size="lg" type="button" onClick={openCreate}>
                    <Plus aria-hidden="true" className="size-5" />
                    {t('actions.add')}
                </Button>
            </header>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    icon={ArrowDownLeft}
                    label={t('summary.income')}
                    value={money(totals.income)}
                    tone="bg-income/15 text-income"
                />
                <SummaryCard
                    icon={ArrowUpRight}
                    label={t('summary.expenses')}
                    value={money(totals.expenses)}
                    tone="bg-expense/15 text-expense"
                />
                <SummaryCard
                    icon={ArrowLeftRight}
                    label={t('summary.transfers')}
                    value={money(totals.transfers)}
                    tone="bg-transfer/15 text-transfer"
                />
                <SummaryCard
                    icon={CircleDollarSign}
                    label={t('summary.net')}
                    value={money(totals.net)}
                    tone="bg-primary/15 text-primary"
                />
            </section>

            <Card className="shadow-none">
                <CardContent className="grid gap-3 p-4 lg:grid-cols-[minmax(15rem,1.6fr)_minmax(15rem,1.2fr)_minmax(10rem,.8fr)_minmax(10rem,.8fr)_auto] lg:items-end">
                    <label className="grid gap-1.5 text-sm font-medium">
                        {t('filters.search')}
                        <span className="relative">
                            <Search
                                aria-hidden="true"
                                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                            />
                            <Input
                                className="pl-9"
                                value={query}
                                placeholder={t('filters.searchPlaceholder')}
                                onChange={(event) => {
                                    setQuery(event.target.value);
                                    setPage(1);
                                }}
                            />
                        </span>
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">
                        {t('filters.dateRange')}
                        <DateRangeField
                            value={dateRange}
                            onChange={(value) => {
                                setDateRange(value);
                                setPage(1);
                            }}
                            placeholder={t('filters.datePlaceholder')}
                            formatDate={(value) => format.dateTime(value, { dateStyle: 'medium' })}
                        />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">
                        {t('filters.wallet')}
                        <Select
                            value={walletFilter}
                            onValueChange={(value) => {
                                setWalletFilter(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('filters.allWallets')}</SelectItem>
                                {wallets.map((wallet) => (
                                    <SelectItem key={wallet} value={wallet}>
                                        {wallet}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">
                        {t('filters.kind')}
                        <Select
                            value={kindFilter}
                            onValueChange={(value) => {
                                setKindFilter(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('filters.allKinds')}</SelectItem>
                                {(['income', 'expense', 'transfer'] as const).map((kind) => (
                                    <SelectItem key={kind} value={kind}>
                                        {t(`filters.${kind}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </label>
                    <Button type="button" variant="secondary" onClick={resetFilters}>
                        <RotateCcw aria-hidden="true" className="size-4" />
                        {t('actions.reset')}
                    </Button>
                </CardContent>
            </Card>

            <Card className="flex min-w-0 flex-col overflow-hidden shadow-none lg:min-h-0">
                <div className="flex shrink-0 items-end justify-between border-b border-border px-4 py-3">
                    <div>
                        <h2 className="m-0 text-xl font-semibold">{t('list.title')}</h2>
                        <p className="m-0 mt-1 text-sm text-muted-foreground">
                            {t('list.count', { count: filtered.length })}
                        </p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => toggleSort('date')}>
                        {sort.key === 'date' && sort.direction === 'ascending' ? (
                            <ArrowUp aria-hidden="true" className="size-4" />
                        ) : (
                            <ArrowDown aria-hidden="true" className="size-4" />
                        )}
                        {t('list.date')}
                    </Button>
                </div>
                {/* Both branches render React elements; the numeric length itself is never rendered. */}
                {/* eslint-disable-next-line react/jsx-no-leaked-render */}
                {visible.length === 0 ? (
                    <div className="min-h-0 flex-1 overflow-y-auto p-8">
                        <FeatureStateBoundary state={{ status: 'empty' }} labels={states}>
                            {() => null}
                        </FeatureStateBoundary>
                    </div>
                ) : (
                    <>
                        <div className="hidden min-h-0 flex-1 overflow-hidden overscroll-contain md:block [&>div]:h-full">
                            <Table>
                                <TableHeader className="sticky top-0 z-10 bg-muted">
                                    <TableRow>
                                        <SortableTableHead
                                            column="date"
                                            label={t('list.date')}
                                            sort={sort}
                                            onSort={toggleSort}
                                        />
                                        <SortableTableHead
                                            column="description"
                                            label={t('list.description')}
                                            sort={sort}
                                            onSort={toggleSort}
                                        />
                                        <SortableTableHead
                                            column="kind"
                                            label={t('list.kind')}
                                            sort={sort}
                                            onSort={toggleSort}
                                        />
                                        <SortableTableHead
                                            column="category"
                                            label={t('list.category')}
                                            sort={sort}
                                            onSort={toggleSort}
                                        />
                                        <SortableTableHead
                                            column="wallet"
                                            label={t('list.wallet')}
                                            sort={sort}
                                            onSort={toggleSort}
                                        />
                                        <SortableTableHead
                                            column="amount"
                                            label={t('list.amount')}
                                            sort={sort}
                                            align="right"
                                            onSort={toggleSort}
                                        />
                                        <TableHead className="w-14">
                                            <span className="sr-only">{t('list.actions')}</span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visible.map((transaction) => (
                                        <TableRow key={transaction.id} className="h-12">
                                            <TableCell className="whitespace-nowrap py-2">
                                                {date(transaction.date)}
                                            </TableCell>
                                            <TableCell className="py-2 font-medium">
                                                {transaction.description ?? t('list.untitled')}
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <KindBadge
                                                    kind={transactionKind(transaction)}
                                                    label={kindLabel(transaction)}
                                                />
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <span className="flex items-center gap-2">
                                                    <Tag aria-hidden="true" className="size-4 text-muted-foreground" />
                                                    {transaction.typeName ?? '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <span className="flex items-center gap-2">
                                                    <WalletCards
                                                        aria-hidden="true"
                                                        className="size-4 text-muted-foreground"
                                                    />
                                                    {transaction.walletName ?? '—'}
                                                    {transaction.destinationWalletName
                                                        ? ` → ${transaction.destinationWalletName}`
                                                        : ''}
                                                </span>
                                            </TableCell>
                                            <TableCell
                                                className={cn(
                                                    'py-2 text-right font-semibold tabular-nums',
                                                    transaction.value < 0 ? 'text-expense' : 'text-income',
                                                )}
                                            >
                                                {transaction.value > 0 ? '+' : ''}
                                                {money(transaction.value)}
                                            </TableCell>
                                            <TableCell className="py-1">{rowActions(transaction)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto overscroll-contain md:hidden">
                            {visible.map((transaction) => (
                                <article key={transaction.id} className="grid grid-cols-[1fr_auto] gap-3 p-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <KindBadge
                                                kind={transactionKind(transaction)}
                                                label={kindLabel(transaction)}
                                            />
                                            <span className="text-xs text-muted-foreground">
                                                {date(transaction.date)}
                                            </span>
                                        </div>
                                        <h3 className="m-0 mt-3 truncate text-base font-semibold">
                                            {transaction.description ?? t('list.untitled')}
                                        </h3>
                                        <p className="m-0 mt-1 truncate text-sm text-muted-foreground">
                                            {transaction.walletName ?? '—'}
                                            {transaction.destinationWalletName
                                                ? ` → ${transaction.destinationWalletName}`
                                                : ''}{' '}
                                            · {transaction.typeName ?? '—'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end justify-between">
                                        <strong
                                            className={cn(
                                                'tabular-nums',
                                                transaction.value < 0 ? 'text-expense' : 'text-income',
                                            )}
                                        >
                                            {transaction.value > 0 ? '+' : ''}
                                            {money(transaction.value)}
                                        </strong>
                                        {rowActions(transaction)}
                                    </div>
                                </article>
                            ))}
                        </div>
                    </>
                )}
                <footer className="flex shrink-0 flex-col gap-3 border-t border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{t('list.perPage')}</span>
                        <Select
                            value={String(pageSize)}
                            onValueChange={(value) => {
                                setPageSize(Number(value));
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[8, 12, 20].map((size) => (
                                    <SelectItem key={size} value={String(size)}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <span className="mr-2 text-sm text-muted-foreground">
                            {t('list.range', {
                                from: filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1,
                                to: Math.min(safePage * pageSize, filtered.length),
                                total: filtered.length,
                            })}
                        </span>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={safePage <= 1}
                            aria-label={t('actions.previous')}
                            onClick={() => setPage((value) => Math.max(1, value - 1))}
                        >
                            <ChevronLeft aria-hidden="true" className="size-4" />
                        </Button>
                        <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                            {safePage}
                        </span>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={safePage >= pageCount}
                            aria-label={t('actions.next')}
                            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                        >
                            <ChevronRight aria-hidden="true" className="size-4" />
                        </Button>
                    </div>
                </footer>
            </Card>

            <TransactionDialog
                open={dialogOpen}
                transaction={editing}
                wallets={wallets}
                onOpenChange={setDialogOpen}
                onSave={save}
            />
            <ConfirmDeleteDialog
                item={deleting}
                title={t('dialog.deleteTitle')}
                description={(item) => t('dialog.deleteDescription', { name: item.description ?? t('list.untitled') })}
                cancelLabel={t('actions.cancel')}
                confirmLabel={t('actions.delete')}
                onOpenChange={(open) => {
                    if (!open) setDeleting(undefined);
                }}
                onConfirm={(item) => {
                    setTransactions((current) => current.filter((transaction) => transaction.id !== item.id));
                    setDeleting(undefined);
                }}
            />
        </div>
    );
}
