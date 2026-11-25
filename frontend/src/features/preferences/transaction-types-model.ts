import type { ApiTransactionType } from '@/lib/api/client';

export const demoTransactionTypes = [
    { id: 1, name: 'home', parentId: null, icon: 'home', color: 'blue' },
    { id: 2, name: 'utilities', parentId: 1, icon: 'utilities', color: 'yellow' },
    { id: 3, name: 'shopping', parentId: null, icon: 'shopping', color: 'red' },
    { id: 4, name: 'groceries', parentId: 3, icon: 'shopping', color: 'orange' },
    { id: 5, name: 'food', parentId: null, icon: 'food', color: 'orange' },
    { id: 6, name: 'restaurants', parentId: 5, icon: 'food', color: 'red' },
    { id: 7, name: 'transport', parentId: null, icon: 'transport', color: 'cyan' },
    { id: 8, name: 'fuel', parentId: 7, icon: 'transport', color: 'blue' },
    { id: 9, name: 'work', parentId: null, icon: 'work', color: 'green' },
    { id: 10, name: 'salary', parentId: 9, icon: 'work', color: 'green' },
    { id: 11, name: 'entertainment', parentId: null, icon: 'entertainment', color: 'purple' },
    { id: 12, name: 'health', parentId: null, icon: 'health', color: 'red' },
] as const;

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
