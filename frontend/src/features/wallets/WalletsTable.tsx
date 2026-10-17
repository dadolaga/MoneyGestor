'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Info, Pencil, Trash2, Wallet } from '@/components/ui/icons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { useWalletFormatting } from './useWalletFormatting';
import { walletColor } from './wallet-model';
import type { DashboardWallet } from './wallet-model';
import { WalletStatus } from './WalletDisplay';

interface WalletTableActions {
    onSelect: (wallet: DashboardWallet) => void;
    onEdit: (wallet: DashboardWallet) => void;
    onDelete: (wallet: DashboardWallet) => void;
}

interface WalletsTableProps extends WalletTableActions {
    wallets: DashboardWallet[];
    isLoading: boolean;
    isReady: boolean;
}

export function WalletsTable({ wallets, isLoading, isReady, onSelect, onEdit, onDelete }: WalletsTableProps) {
    const t = useTranslations('WalletsDashboard');

    return (
        <Card aria-busy={isLoading} className="min-h-[360px] min-w-0 overflow-hidden shadow-none">
            <h2 className="m-0 px-5 py-4 text-lg font-[650]">{t('table.title')}</h2>
            <Table className="min-w-[780px] border-collapse">
                <TableHeader>
                    <TableRow>
                        {['name', 'type', 'institution', 'balance', 'updated', 'status', 'actions'].map((key) => (
                            <TableHead
                                key={key}
                                className={cn('h-11 bg-muted text-xs', key === 'balance' && 'text-right')}
                            >
                                {t(`table.${key}`)}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {!!isReady && wallets.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                                {t('states.empty')}
                            </TableCell>
                        </TableRow>
                    )}
                    {wallets.map((wallet) => (
                        <WalletTableRow
                            key={wallet.id}
                            wallet={wallet}
                            onSelect={onSelect}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}

interface WalletTableRowProps extends WalletTableActions {
    wallet: DashboardWallet;
}

function WalletTableRow({ wallet, onSelect, onEdit, onDelete }: WalletTableRowProps) {
    const t = useTranslations('WalletsDashboard');
    const { walletBalance, walletType } = useWalletFormatting();

    return (
        <TableRow className="wallet-content-enter [&>td]:px-4 [&>td]:py-1 [&>td]:text-sm [&>td:last-child]:w-20">
            <TableCell>
                <span className="inline-flex items-center gap-2.5 border-0">
                    <Wallet aria-hidden="true" className="size-4" style={{ color: walletColor(wallet) }} />
                    {wallet.name}
                </span>
            </TableCell>
            <TableCell>{walletType(wallet)}</TableCell>
            <TableCell>{wallet.draft?.institution ?? '—'}</TableCell>
            <TableCell className="text-right tabular-nums">{walletBalance(wallet)}</TableCell>
            <TableCell>—</TableCell>
            <TableCell>
                <WalletStatus />
            </TableCell>
            <TableCell>
                <div className="flex items-center">
                    <Button
                        type="button"
                        variant="transparent"
                        size="icon"
                        className="size-8"
                        aria-label={t('actions.infoFor', { name: wallet.name })}
                        title={t('actions.info')}
                        onClick={() => onSelect(wallet)}
                    >
                        <Info aria-hidden="true" className="size-4.5" />
                    </Button>
                    <Button
                        type="button"
                        variant="transparent"
                        size="icon"
                        className="size-8"
                        aria-label={t('actions.editFor', { name: wallet.name })}
                        title={t('actions.edit')}
                        onClick={() => onEdit(wallet)}
                    >
                        <Pencil aria-hidden="true" className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="transparent"
                        size="icon"
                        className="size-8 text-destructive"
                        aria-label={t('actions.deleteFor', { name: wallet.name })}
                        title={t('actions.delete')}
                        onClick={() => onDelete(wallet)}
                    >
                        <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}
