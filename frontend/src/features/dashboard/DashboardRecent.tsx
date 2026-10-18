'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight } from '@/components/ui/icons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CategoryMark, TransactionAmount, WalletLabel } from '@/features/transactions/TransactionDisplay';
import { useTransactionFormatting } from '@/features/transactions/useTransactionFormatting';
import { Link } from '@/i18n/navigation';
import type { ApiTransaction } from '@/lib/api/client';

interface DashboardRecentProps {
    rows: ApiTransaction[];
    loading: boolean;
    failed: boolean;
}

export function DashboardRecent({ rows, loading, failed }: DashboardRecentProps) {
    const t = useTranslations('ApiFinance.dashboard');
    const movements = useTranslations('Movements.list');
    const { money, date } = useTransactionFormatting();

    return (
        <Card className="min-w-0 rounded-lg border-0 bg-transparent p-0 shadow-none sm:border sm:bg-card sm:p-4" aria-busy={loading}>
            <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="m-0 text-lg font-semibold">{t('recent')}</h2>
                <Button asChild variant="transparent" size="sm" className="min-h-11 px-1 text-xs font-normal sm:h-7 sm:min-h-0 sm:text-sm">
                    <Link href="/dashboard/transaction">{t('viewAll')}<ArrowRight aria-hidden="true" className="size-4" /></Link>
                </Button>
            </div>
            {!loading && !failed && rows.length > 0 ? (
                <Table className="table-fixed border-separate border-spacing-y-1 sm:table-auto sm:border-collapse sm:whitespace-nowrap [&_th]:h-8 [&_th]:px-2 [&_th]:text-xs [&_th:last-child]:text-right [&_td]:px-2 [&_td]:py-2 [&_td]:text-xs sm:[&_td]:py-1">
                    <caption className="sr-only">{t('recent')}</caption>
                    <TableHeader className="hidden bg-muted/60 sm:table-header-group">
                        <TableRow>
                            {(['date', 'descriptionField', 'category', 'wallet', 'amount'] as const).map((key) => (
                                <TableHead key={key}>{t(key)}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell className="hidden text-muted-foreground sm:table-cell">{date(row.date)}</TableCell>
                                <TableCell className="rounded-l-xl border-y border-l border-solid border-border bg-card sm:rounded-none sm:border-0 sm:bg-transparent">
                                    <span className="flex min-w-0 items-center gap-2.5">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted sm:size-4 sm:bg-transparent">
                                            <CategoryMark row={row} className="size-6 sm:size-4" />
                                        </span>
                                        <span className="min-w-0 sm:max-w-52">
                                            <span className="block truncate text-sm font-medium sm:text-xs sm:font-normal" title={row.description ?? undefined}>{row.description ?? movements('untitled')}</span>
                                            <span className="mt-1 block truncate text-[11px] text-muted-foreground sm:hidden">{date(row.date)} · {row.wallet.name}</span>
                                        </span>
                                    </span>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell"><span className="flex items-center gap-2"><CategoryMark row={row} className="size-4" />{row.type.name}</span></TableCell>
                                <TableCell className="hidden sm:table-cell"><WalletLabel row={row} compact /></TableCell>
                                <TableCell className="w-[38%] rounded-r-xl border-y border-r border-solid border-border bg-card text-right sm:w-auto sm:rounded-none sm:border-0 sm:bg-transparent">
                                    <span className="inline-block max-w-full overflow-x-auto align-middle"><TransactionAmount row={row} money={money} /></span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <p role="status" className="m-0 flex min-h-48 items-center justify-center text-center text-sm text-muted-foreground">
                    {t(loading ? 'loading' : failed ? 'requestFailed' : 'emptyMovements')}
                </p>
            )}
        </Card>
    );
}
