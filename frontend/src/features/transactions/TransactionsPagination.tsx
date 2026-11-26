'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from '@/components/ui/icons';
import { Select } from '@/components/ui/select';

interface TransactionsPaginationProps {
    total: number;
    page: number;
    pageSize: number;
    loading: boolean;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}

export function TransactionsPagination({
    total,
    page,
    pageSize,
    loading,
    onPageChange,
    onPageSizeChange,
}: TransactionsPaginationProps) {
    const t = useTranslations('Movements');
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    const firstPage = Math.max(1, Math.min(page - 2, maxPage - 4));
    const pages = Array.from({ length: Math.min(5, maxPage) }, (_, index) => firstPage + index);

    function currentPage(number: number) {
        return page === number ? ('page' as const) : undefined;
    }

    return (
        <footer className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
                <span>{t('list.show')}</span>
                <Select
                    className="h-8 w-20 py-1 text-xs"
                    aria-label={t('list.perPage')}
                    value={pageSize}
                    disabled={loading}
                    onValueChange={(value) => {
                        onPageSizeChange(Number(value));
                        onPageChange(1);
                    }}
                >
                    {[10, 20, 50, 100].map((size) => (
                        <option key={size} value={size}>
                            {size}
                        </option>
                    ))}
                </Select>
                <span>{t('list.ofResults', { total })}</span>
            </div>
            <nav aria-label={t('list.pagination')} className="flex items-center gap-1">
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-7 border border-solid border-border"
                    disabled={loading || page <= 1}
                    aria-label={t('actions.previous')}
                    onClick={() => onPageChange(page - 1)}
                >
                    <ChevronLeft aria-hidden="true" className="size-4" />
                </Button>
                {pages.map((number) => (
                    <Button
                        key={number}
                        type="button"
                        variant={number === page ? 'default' : 'outline'}
                        className="size-7 border border-solid border-border p-0 text-xs"
                        disabled={loading}
                        aria-label={t('list.page', { page: number })}
                        aria-current={currentPage(number)}
                        onClick={() => onPageChange(number)}
                    >
                        {number}
                    </Button>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-7 border border-solid border-border"
                    disabled={loading || page >= maxPage}
                    aria-label={t('actions.next')}
                    onClick={() => onPageChange(page + 1)}
                >
                    <ChevronRight aria-hidden="true" className="size-4" />
                </Button>
            </nav>
        </footer>
    );
}
