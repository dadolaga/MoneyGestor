import { SortType } from '@/context/SortTableContext';
import test from 'node:test';

export function convertToApi(sort: SortType) {
    var text = '';

    var sortSize: number = Object.keys(sort).length;

    Object.keys(sort).forEach((key, index) => {
        if (sort[key] !== undefined) {
            text += `${sort[key] === 'desc' ? '!' : ''}${key}${index === sortSize - 1 ? '' : '+'}`;
        }
    });

    return text.length > 0 ? text : undefined;
}
