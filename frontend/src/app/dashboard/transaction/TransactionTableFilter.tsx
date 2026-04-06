import RangePickerField, { DateRange } from '@/component/DataPickerNew';
import Input from '@/component/Input';
import { FormProvider, FormType } from '@/context/FormContext';
import useApi from '@/hooks/useApi';
import { Type, Wallet } from '@/models/backend';
import {
    Box,
    FormControl,
    FormHelperText,
    InputBase,
    InputLabel,
    MenuItem,
    OutlinedInput,
    Select,
    TextField,
} from '@mui/material';
import dayjs from 'dayjs';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

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
    const [wallet, setWallet] = useState<Wallet[]>(undefined);
    const [types, setTypes] = useState<Type[]>(undefined);
    const [date, setDate] = useState<DateRange>(undefined);

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

        setUpdateData(false);
    }, [updateData]);

    const updateValueHandler = useCallback((data: FormType, updatedKey: string) => {
        setFilter({
            name: data['name']?.value as string,
            walletId: data['wallet']?.value as number,
            typeId: data['type']?.value as number,
        });

        if (updatedKey == 'name') {
            clearTimeout(timeoutRef.current);

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
                    values={wallet?.map((w) => ({ key: w.id, text: w.name }))}
                    disabled={wallet === undefined}
                />
                <Input
                    type="multi"
                    size="small"
                    name="type"
                    label="Tipo"
                    emptySelect
                    values={types?.map((t) => ({ key: t.id, text: t.name }))}
                    disabled={types === undefined}
                />
                <RangePickerField date={date} onDateChange={setDate} />
            </FormProvider>
        </Box>
    );
}
