import type { FilterData } from '@/app/dashboard/transaction/TransactionTableFilter';
import type { SortType } from '@/context/SortTableContext';

export function convertSortToApi(sort: SortType) {
    let text = '';

    const sortSize: number = Object.keys(sort).length;

    Object.keys(sort).forEach((key, index) => {
        if (sort[key] !== undefined) {
            text += `${sort[key] === 'desc' ? '!' : ''}${key}${index === sortSize - 1 ? '' : '+'}`;
        }
    });

    return text.length > 0 ? text : undefined;
}

export function convertFilterToApi(filter?: FilterData) {
    console.log('convertFilterToApi: ', filter);

    if (filter === undefined) return undefined;

    let text = '';

    if (filter.name !== undefined && filter.name.trim().length > 0) {
        text += `description~${filter.name}`;
    }

    if (filter.walletId !== undefined) {
        text += `${text.length > 0 ? '&' : ''}walletId=${filter.walletId}`;
    }

    if (filter.typeId !== undefined) {
        text += `${text.length > 0 ? '&' : ''}transactionTypeId=${filter.typeId}`;
    }

    console.log(text);

    return text.length > 0 ? text : undefined;
}
