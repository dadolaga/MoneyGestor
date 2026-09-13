import { ArrowRightLeft } from 'lucide-react';

import { FeatureStateBoundary } from '@/components/shared/feature-state';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { FeatureState } from '@/types/feature-state';

import type { TransactionViewModel } from './model';

interface TransactionsPreviewProps {
    state: FeatureState<TransactionViewModel[]>;
    labels: {
        description: string;
        wallet: string;
        date: string;
        amount: string;
        fallbackDescription: string;
        transfer: string;
        states: { idle: string; loading: string; empty: string; error: string };
    };
    formatDate: (value: string) => string;
    formatMoney: (value: number) => string;
}

export function TransactionsPreview({ state, labels, formatDate, formatMoney }: TransactionsPreviewProps) {
    return (
        <FeatureStateBoundary state={state} labels={labels.states}>
            {(transactions) => (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{labels.description}</TableHead>
                                <TableHead>{labels.wallet}</TableHead>
                                <TableHead>{labels.date}</TableHead>
                                <TableHead className="text-right">{labels.amount}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map((transaction) => (
                                <TableRow key={transaction.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span>{transaction.description ?? labels.fallbackDescription}</span>
                                            {!!transaction.isTransfer && (
                                                <Badge variant="transfer">
                                                    <ArrowRightLeft className="size-3" />
                                                    {labels.transfer}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{transaction.walletName ?? '—'}</TableCell>
                                    <TableCell>{transaction.date ? formatDate(transaction.date) : '—'}</TableCell>
                                    <TableCell
                                        className={
                                            transaction.value < 0
                                                ? 'text-right font-medium tabular-nums text-expense'
                                                : 'text-right font-medium tabular-nums text-income'
                                        }
                                    >
                                        {formatMoney(transaction.value)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </FeatureStateBoundary>
    );
}
