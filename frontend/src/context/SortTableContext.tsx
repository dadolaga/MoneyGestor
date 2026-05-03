import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { convertSortToApi } from '@/utilis/backend';

export type SortType = { [key: string]: 'asc' | 'desc' | undefined };

export type SortHandler = (sort: SortType, sortString: string) => void;

interface SortContext {
    sort: SortType;
    clickOnRow: (key: string) => void;
}

const SortContext = createContext<SortContext>({ sort: {}, clickOnRow: () => {} });

export const useSort = () => useContext<SortContext>(SortContext);

export function SortProvider(props: { onSort: SortHandler; default?: SortType; children: ReactNode }) {
    const [sort, setSort] = useState<SortType>({});

    useEffect(() => {
        if (props.default && Object.keys(sort).length == 0) {
            queueMicrotask(() =>
                setSort(
                    Object.keys(props.default!).reduce<SortType>((acc, key) => {
                        acc[key] = props.default![key];
                        return acc;
                    }, {}),
                ),
            );
        }
    }, [props.default, sort]);

    const clickOnRow = useCallback(
        (key: string) => {
            setSort((value) => {
                const newValue: SortType = {
                    ...value,
                    [key]: value[key] !== undefined ? (value[key] === 'asc' ? 'desc' : undefined) : 'asc',
                };

                props.onSort(newValue, convertSortToApi(newValue) ?? '');

                return newValue;
            });
        },
        [props],
    );

    return <SortContext.Provider value={{ sort, clickOnRow }}>{props.children}</SortContext.Provider>;
}
