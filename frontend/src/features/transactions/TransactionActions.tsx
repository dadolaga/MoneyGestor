'use client';

import { useTranslations } from 'next-intl';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Ellipsis } from '@/components/ui/icons';
import type { ApiTransaction } from '@/lib/api/client';

export interface TransactionActionHandlers {
    onEdit: (row: ApiTransaction) => void;
    onDelete: (row: ApiTransaction) => void;
}

export function TransactionActions({ row, onEdit, onDelete }: TransactionActionHandlers & { row: ApiTransaction }) {
    const t = useTranslations('Movements');
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex size-7 items-center justify-center rounded-md border-0 bg-transparent text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t('actions.more', { name: row.description ?? t('list.untitled') })}>
                <Ellipsis aria-hidden="true" className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(row)}>{t('actions.edit')}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onDelete(row)} className="text-destructive">{t('actions.delete')}</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
