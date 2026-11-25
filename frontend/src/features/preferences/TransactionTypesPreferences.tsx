'use client';

import { useEffect, useId, useState } from 'react';

import { useLocale, useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronRight, LoaderCircle, LockKeyhole, Pencil, Plus, Search, Tag, X } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CategoryIcon } from '@/features/categories/category-display';
import { CategoryEditorDialog } from '@/features/categories/CategoryEditorDialog';
import { ApiProblemError, apiClient } from '@/lib/api/client';
import type { ApiTransactionType } from '@/lib/api/client';
import { notify } from '@/lib/notifications';

import { transactionTypeRows } from './transaction-types-model';

export function TransactionTypesPreferences() {
    const t = useTranslations('Preferences');
    const category = useTranslations('Movements.categoryEditor');
    const locale = useLocale();
    const id = useId();
    const [types, setTypes] = useState<ApiTransactionType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    const [search, setSearch] = useState('');
    const [editor, setEditor] = useState<{ type?: ApiTransactionType }>();
    const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());

    useEffect(() => {
        const controller = new AbortController();
        void (async () => {
            setLoading(true);
            setError('');
            try {
                const result = await apiClient.transactionTypes(controller.signal);
                if (!controller.signal.aborted) setTypes(result.filter((type) => type.systemKind === null));
            } catch (cause) {
                if (!controller.signal.aborted) setError(t(cause instanceof ApiProblemError && cause.status === 401 ? 'signInAgain' : 'loadFailed'));
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        })();
        return () => controller.abort();
    }, [revision, t]);

    const query = search.trim().toLocaleLowerCase(locale);
    const byId = new Map(types.map((type) => [type.id, type]));
    const visibleIds = new Set<number>();

    // Retain each matching type's ancestors so its position remains clear while searching.
    for (const type of types) {
        if (!type.name.toLocaleLowerCase(locale).includes(query)) continue;
        let current: ApiTransactionType | undefined = type;
        while (current && !visibleIds.has(current.id)) {
            visibleIds.add(current.id);
            current = current.parentId === null ? undefined : byId.get(current.parentId);
        }
    }
    const shownIds = new Set<number>();
    const rows = transactionTypeRows(types, locale).filter(({ type }) => {
        if (!visibleIds.has(type.id)) return false;
        if (type.parentId !== null && (!shownIds.has(type.parentId) || !expandedIds.has(type.parentId))) return false;
        shownIds.add(type.id);
        return true;
    });
    const showRows = !loading && error.length === 0;
    const countLabel = loading ? t('loading') : error.length > 0 ? '—' : t('total', { count: types.length });
    const resultsLabel = loading ? t('loading') : error.length > 0 ? t('loadFailed') : t('results', { count: rows.length });
    const emptyTitle = types.length === 0 ? t('noCategories') : t('emptyTitle');
    const emptyDescription = types.length === 0 ? t('noCategoriesDescription') : t('emptyDescription');

    function retryHandler() {
        setRevision((revision) => revision + 1);
    }

    function expandAncestors(parentIds: number[]) {
        setExpandedIds((expanded) => {
            const next = new Set(expanded);
            for (const parentId of parentIds) {
                let current = byId.get(parentId);
                while (current !== undefined) {
                    next.add(current.id);
                    current = current.parentId === null ? undefined : byId.get(current.parentId);
                }
            }
            return next;
        });
    }

    function searchHandler(value: string) {
        setSearch(value);
        const query = value.trim().toLocaleLowerCase(locale);
        if (query.length === 0) return;
        expandAncestors(types.flatMap((type) => type.parentId !== null
            && type.name.toLocaleLowerCase(locale).includes(query) ? [type.parentId] : []));
    }

    function toggleCategoryHandler(typeId: number) {
        setExpandedIds((expanded) => {
            const next = new Set(expanded);
            if (next.has(typeId)) next.delete(typeId);
            else {
                const branchIds = new Set([typeId]);
                for (const parentId of branchIds) {
                    next.add(parentId);
                    for (const type of types) {
                        if (type.parentId === parentId) branchIds.add(type.id);
                    }
                }
            }
            return next;
        });
    }

    function savedHandler(saved: ApiTransactionType) {
        const editingId = editor?.type?.id;
        setTypes((types) => types.some((type) => type.id === saved.id)
            ? types.map((type) => type.id === saved.id ? saved : type)
            : [...types, saved]);
        if (editingId === undefined) setSearch('');
        if (saved.parentId !== null) expandAncestors([saved.parentId]);
        notify.success(t(editingId === undefined ? 'created' : 'saved'));
        retryHandler();
    }

    return (
        <div className="flex min-w-0 flex-col gap-5">
            <section aria-labelledby={`${id}-types`}>
                <Card className="overflow-hidden border border-solid border-border shadow-none">
                    <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Tag aria-hidden="true" className="size-5" />
                            </span>
                            <div className="min-w-0">
                                <h2 id={`${id}-types`} className="m-0 text-lg font-semibold">{t('types')}</h2>
                                <p className="m-0 mt-1 text-sm leading-relaxed text-muted-foreground">{t('typesDescription')}</p>
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-3">
                            <Badge variant="secondary">{countLabel}</Badge>
                            <Button type="button" disabled={loading || !!error} onClick={() => setEditor({})}>
                                <Plus aria-hidden="true" className="size-4" />{category('title')}
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-0 border-y border-solid border-border bg-muted/20 px-5 py-3 sm:px-6">
                        <div className="relative w-full sm:max-w-sm">
                            <label className="sr-only" htmlFor={`${id}-search`}>{t('search')}</label>
                            <Search aria-hidden="true" className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
                            <Input id={`${id}-search`} value={search} disabled={loading || !!error} onChange={(event) => searchHandler(event.target.value)}
                                placeholder={t('searchPlaceholder')} className="rounded-xl border-solid pr-11 pl-10" />
                            {!!search && (
                                <Button type="button" variant="transparent" size="icon" className="absolute top-0 right-0"
                                    aria-label={t('clearSearch')} onClick={() => setSearch('')}>
                                    <X aria-hidden="true" className="size-4" />
                                </Button>
                            )}
                        </div>
                        <p role="status" className="m-0 text-xs text-muted-foreground">{resultsLabel}</p>
                    </div>

                    <Table aria-labelledby={`${id}-types`} className="table-fixed border-collapse"
                        containerProps={{ role: 'region', 'aria-labelledby': `${id}-types`, tabIndex: 0,
                            className: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring' }}>
                        <TableHeader className="bg-muted/20">
                            <TableRow className="border-0 border-b border-solid border-border hover:bg-transparent">
                                <TableHead scope="col" className="pl-5 sm:pl-6">{category('name')}</TableHead>
                                <TableHead scope="col" className="w-16 pr-3 text-right sm:w-20 sm:pr-5">
                                    <span className="sr-only">{t('actions')}</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!!showRows && rows.map(({ type, depth }) => {
                                const hasChildren = types.some((child) => child.parentId === type.id);
                                const isExpanded = expandedIds.has(type.id);
                                const DisclosureIcon = isExpanded ? ChevronDown : ChevronRight;
                                const EditIcon = type.isGlobal ? LockKeyhole : Pencil;
                                const editLabel = type.isGlobal ? t('readOnlyCategory') : t('editType', { name: type.name });
                                const label = (
                                    <>
                                        {hasChildren ? <DisclosureIcon aria-hidden="true" className="size-4 text-muted-foreground" /> : <span aria-hidden="true" className="size-4 shrink-0" />}
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 [&>span]:size-5">
                                            <CategoryIcon type={type} />
                                        </span>
                                        <span className="min-w-0 font-medium [overflow-wrap:anywhere]">{type.name}</span>
                                    </>
                                );
                                return (
                                    <TableRow key={type.id} className="border-0 border-b border-solid border-border">
                                        <TableCell className="py-1 pr-1 pl-3 sm:pl-5">
                                            <div style={{ paddingInlineStart: `${Math.min(depth, 4) * 16}px` }}>
                                                {hasChildren ? (
                                                    <Button type="button" variant="transparent" aria-expanded={isExpanded}
                                                        aria-label={t(isExpanded ? 'collapseCategory' : 'expandCategory', { name: type.name })}
                                                        className="h-auto min-h-12 w-full min-w-0 justify-start gap-2 whitespace-normal px-1 py-2 text-left"
                                                        onClick={() => toggleCategoryHandler(type.id)}>
                                                        {label}
                                                    </Button>
                                                ) : (
                                                    <div className="flex min-h-12 min-w-0 items-center gap-2 px-1 py-2">{label}</div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2 pr-3 pl-1 text-right sm:pr-5">
                                            <Button type="button" variant="outline" size="icon" aria-label={editLabel} title={editLabel}
                                                disabled={type.isGlobal} className="border border-solid border-input" onClick={() => setEditor({ type })}>
                                                <EditIcon aria-hidden="true" className="size-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {!!loading && (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={2}>
                                        <div role="status" className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
                                            <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />{t('loading')}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {!!error && (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={2}>
                                        <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center text-destructive">
                                            <p className="m-0">{error}</p>
                                            <Button type="button" variant="outline" onClick={retryHandler}>{t('retry')}</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {!!showRows && rows.length === 0 && (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={2}>
                                        <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
                                            <Search aria-hidden="true" className="mb-1 size-8 text-muted-foreground" />
                                            <p className="m-0 font-semibold">{emptyTitle}</p>
                                            <p className="m-0 text-muted-foreground">{emptyDescription}</p>
                                            {!!query && <Button type="button" variant="transparent" className="mt-2" onClick={() => setSearch('')}>{t('clearSearch')}</Button>}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <p className="m-0 border-0 border-t border-solid border-border bg-muted/20 px-5 py-4 text-xs leading-relaxed text-muted-foreground sm:px-6">{t('hierarchyHint')}</p>
                </Card>
            </section>
            {editor !== undefined && (
                <CategoryEditorDialog category={editor.type} loading={loading} error={error} onRetry={retryHandler}
                    types={transactionTypeRows(types, locale).map(({ type }) => type)}
                    onSaved={savedHandler} onClose={() => setEditor(undefined)} />
            )}
        </div>
    );
}
