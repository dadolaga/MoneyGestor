'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Ellipsis } from '@/components/ui/icons';
import type { ApiTransaction } from '@/lib/api/client';
import { notify } from '@/lib/notifications';

export function TransactionActions({ row }: { row: ApiTransaction }) {
    const t = useTranslations('Movements');
    return (
        <Button
            type="button"
            size="icon"
            variant="transparent"
            className="size-7"
            aria-label={t('actions.more', { name: row.description ?? t('list.untitled') })}
            title={t('actions.deferred')}
            onClick={() => notify.info(t('actions.deferred'))}
        >
            <Ellipsis aria-hidden="true" className="size-5" />
        </Button>
    );
}
