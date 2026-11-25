import type { ApiTransactionType } from '@/lib/api/client';

export function transactionTypeRows(types: ApiTransactionType[], locale: string) {
    const rows: { type: ApiTransactionType; depth: number }[] = [];
    const sorted = [...types].sort((a, b) => a.name.localeCompare(b.name, locale) || a.id - b.id);
    function appendChildren(parentId: number | null, depth: number) {
        for (const type of sorted) {
            if (type.parentId !== parentId) continue;
            rows.push({ type, depth });
            appendChildren(type.id, depth + 1);
        }
    }
    appendChildren(null, 0);
    return rows;
}
