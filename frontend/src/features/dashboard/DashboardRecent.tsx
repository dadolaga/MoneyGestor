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
        <Card className="min-w-0 rounded-lg p-4 shadow-none" aria-busy={loading}>
            <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="m-0 text-lg font-semibold">{t('recent')}</h2>
                <Button asChild variant="transparent" size="sm" className="h-7 px-1 font-normal">
                    <Link href="/dashboard/transaction">{t('viewAll')}<ArrowRight aria-hidden="true" className="size-4" /></Link>
                </Button>
            </div>
            {!loading && !failed && rows.length > 0 ? (
                <Table className="border-collapse whitespace-nowrap [&_th]:h-8 [&_th]:px-2 [&_th]:text-xs [&_th:last-child]:text-right [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs">
                    <caption className="sr-only">{t('recent')}</caption>
                    <TableHeader className="bg-muted/60">
                        <TableRow>
                            {(['date', 'descriptionField', 'category', 'wallet', 'amount'] as const).map((key) => (
                                <TableHead key={key}>{t(key)}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell className="text-muted-foreground">{date(row.date)}</TableCell>
                                <TableCell>
                                    <span className="flex items-center gap-2.5">
                                        <CategoryMark row={row} className="size-4" />
                                        <span className="max-w-52 truncate" title={row.description ?? undefined}>{row.description ?? movements('untitled')}</span>
                                    </span>
                                </TableCell>
                                <TableCell><span className="flex items-center gap-2"><CategoryMark row={row} className="size-4" />{row.type.name}</span></TableCell>
                                <TableCell><WalletLabel row={row} compact /></TableCell>
                                <TableCell className="text-right"><TransactionAmount row={row} money={money} /></TableCell>
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
