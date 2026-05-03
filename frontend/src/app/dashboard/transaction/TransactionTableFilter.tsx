import { useCallback, useEffect, useRef, useState } from 'react';

import { Box } from '@mui/material';

import type { DateRange } from '@/component/DataPickerNew';
import RangePickerField from '@/component/DataPickerNew';
import Input from '@/component/Input';
import type { FormType } from '@/context/FormContext';
import { FormProvider } from '@/context/FormContext';
import useApi from '@/hooks/useApi';
import type { Type, Wallet } from '@/models/backend';

export interface FilterData {
    name?: string;
    walletId?: number;
    typeId?: number;
    data?: {
        from: Date;
        to: Date;
    };
}

interface IProps {
    default?: FilterData;
    setData: (data: FilterData) => void;
}

export default function TransactionTableFilter(props: IProps) {
    const api = useApi();

    const timeoutRef = useRef<NodeJS.Timeout>(null);

    const [filer, setFilter] = useState<FilterData>({});
    const [updateData, setUpdateData] = useState<boolean>(false);
    const [wallet, setWallet] = useState<Wallet[]>();
    const [types, setTypes] = useState<Type[]>();
    const [date, setDate] = useState<DateRange>();

    useEffect(() => {
        api.wallet
            .get()
            .onSuccess((value) => setWallet(value))
            .execute();

        api.type
            .get()
            .onSuccess((value) => setTypes(value))
            .execute();
    }, []);

    useEffect(() => {
        if (!updateData) return;

        console.log(filer);
        props.setData({
            name: filer.name === undefined || filer.name === '' ? undefined : filer.name,
            walletId: filer.walletId,
            typeId: filer.typeId,
        });

        queueMicrotask(() => setUpdateData(false));
    }, [filer, props, updateData]);

    const updateValueHandler = useCallback((data: FormType, updatedKey: string) => {
        setFilter({
            name: data['name']?.value as string,
            walletId: data['wallet']?.value as number,
            typeId: data['type']?.value as number,
        });

        if (updatedKey == 'name') {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                setUpdateData(true);
            }, 750);
        } else {
            setUpdateData(true);
        }
    }, []);

    return (
        <Box display="flex" gap={1} sx={{ width: '40%' }}>
            <FormProvider settings={{}} onUpdate={updateValueHandler}>
                <Input type="text" size="small" name="name" label="Nome" />
                <Input
                    type="multi"
                    size="small"
                    name="wallet"
                    label="Portafoglio"
                    emptySelect
                    values={wallet?.map((w) => ({ key: w.id!, text: w.name }))}
                    disabled={wallet === undefined}
                />
                <Input
                    type="multi"
                    size="small"
                    name="type"
                    label="Tipo"
                    emptySelect
                    values={types?.map((t) => ({ key: t.id!, text: t.name }))}
                    disabled={types === undefined}
                />
                <RangePickerField date={date} onDateChange={setDate} />
            </FormProvider>
        </Box>
    );
}
