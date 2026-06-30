import { useCallback, useMemo } from 'react';

import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';
import type { EnqueueSnackbar } from 'notistack';
import { useSnackbar } from 'notistack';
import { useCookies } from 'react-cookie';

import type { DateRange } from '@/component/DataPickerNew';
import type {
    ApiList,
    Color,
    DashboardOutput,
    ListFilter,
    Login,
    Transaction,
    Type,
    User,
    Wallet,
} from '@/models/backend';

export interface Response<T> {
    code: number;
    message: string;
    data?: T;
}

export class ResponseError extends Error {
    code: number;

    constructor(response: Response<any>) {
        super(response.message);
        this.code = response.code;
    }
}

export default function useApi() {
    const [cookie] = useCookies(['token']);
    const { enqueueSnackbar } = useSnackbar();

    const myAxios = useMemo<AxiosInstance>(() => {
        const instance = axios.create({
            baseURL: process.env.NEXT_API_PORT ?? 'https://localhost:7184',
        });

        return instance;
    }, []);

    const request = useCallback(
        <T>(
            type: 'POST' | 'GET' | 'PUT' | 'DELETE',
            url: string,
            data?: object,
        ): Promise<AxiosResponse<Response<T>>> => {
            const axiosConfig: AxiosRequestConfig<object> = {
                params: type === 'GET' ? data : undefined,
                data: data,
                headers: cookie && {
                    Authorization: cookie.token,
                },
            };

            switch (type) {
                case 'POST':
                    return myAxios.post(url, data, axiosConfig);
                case 'GET':
                    return myAxios.get(url, axiosConfig);
                case 'PUT':
                    return myAxios.put(url, data, axiosConfig);
                case 'DELETE':
                    return myAxios.delete(url, axiosConfig);
            }
        },
        [cookie, myAxios],
    );

    return {
        user: {
            add: (user: User) =>
                new ApiRequest<number>(() => request<number>('POST', '/user/add', user), enqueueSnackbar),

            login: (login: Login) =>
                new ApiRequest<string>(() => request<string>('POST', '/user/login', login), enqueueSnackbar),

            info: () => new ApiRequest<User>(() => request<User>('GET', '/user/info'), enqueueSnackbar),
        },

        color: {
            get: () => new ApiRequest<Color[]>(() => request<Color[]>('GET', '/color'), enqueueSnackbar),
        },

        wallet: {
            add: (wallet: Wallet) =>
                new ApiRequest<number>(() => request<number>('POST', '/wallet', wallet), enqueueSnackbar),

            get: () => new ApiRequest<Wallet[]>(() => request<Wallet[]>('GET', '/wallet'), enqueueSnackbar),

            getSingle: (id: number) =>
                new ApiRequest<Wallet>(() => request<Wallet>('GET', `/wallet/${id}`), enqueueSnackbar),

            modify: (id: number, wallet: Wallet) =>
                new ApiRequest<number>(() => request<number>('PUT', `/wallet/${id}`, wallet), enqueueSnackbar),

            delete: (id: number) =>
                new ApiRequest<number>(() => request<number>('DELETE', `/wallet/${id}`), enqueueSnackbar),

            favorite: (id: number) =>
                new ApiRequest<number>(() => request<number>('PUT', `/wallet/favorite/${id}`), enqueueSnackbar),
        },

        type: {
            get: () => new ApiRequest<Type[]>(() => request<Type[]>('GET', '/type'), enqueueSnackbar),

            add: (type: Type) => new ApiRequest<number>(() => request<number>('POST', '/type', type), enqueueSnackbar),
        },

        transaction: {
            add: (transaction: Transaction) =>
                new ApiRequest<number>(() => request<number>('POST', '/transaction', transaction), enqueueSnackbar),

            list: (filter: ListFilter) => {
                console.trace();

                return new ApiRequest<ApiList<Transaction>>(
                    () => request<ApiList<Transaction>>('GET', '/transaction', filter),
                    enqueueSnackbar,
                );
            },

            modify: (id: number, transaction: Transaction) =>
                new ApiRequest<number>(
                    () => request<number>('PUT', `/transaction/${id}`, transaction),
                    enqueueSnackbar,
                ),

            getSingle: (id: number) =>
                new ApiRequest<Transaction>(() => request<Transaction>('GET', `/transaction/${id}`), enqueueSnackbar),

            delete: (id: number) =>
                new ApiRequest<number>(() => request<number>('DELETE', `/transaction/${id}`), enqueueSnackbar),
        },

        dashboard: {
            all: (dateRange: DateRange) =>
                new ApiRequest<DashboardOutput>(
                    () =>
                        request<DashboardOutput>('GET', '/dashboard/all', { from: dateRange.start, to: dateRange.end }),
                    enqueueSnackbar,
                ),
        },
    };
}

export class ApiRequest<T_RETURN> {
    private enqueueSnackbar: EnqueueSnackbar;
    private actionFunction: () => Promise<AxiosResponse<Response<T_RETURN>>>;
    private successFunction: (_data: T_RETURN) => void;
    private errorFunction: (_error: ResponseError) => void;
    private finishFunction: () => void;

    constructor(action: () => Promise<AxiosResponse<Response<T_RETURN>>>, snakebar: EnqueueSnackbar) {
        this.actionFunction = action;
        this.enqueueSnackbar = snakebar;
        this.successFunction = () => {};
        this.errorFunction = () => {};
        this.finishFunction = () => {};
    }

    onSuccess(callback: (data: T_RETURN) => void) {
        this.successFunction = callback;
        return this;
    }

    onError(callback: (error: ResponseError) => void) {
        this.errorFunction = callback;
        return this;
    }

    onFinish(callback: () => void) {
        this.finishFunction = callback;
        return this;
    }

    execute() {
        this.actionFunction()
            .then((axiosResponse) => {
                const response: Response<T_RETURN> = axiosResponse.data;
                console.debug(response);

                if (response.code === 0) {
                    this.successFunction(response.data as T_RETURN);
                }
            })
            .catch((error) => {
                console.log(error);

                if (error.code === 'ERR_NETWORK') {
                    this.enqueueSnackbar('Server error', { variant: 'error' });
                    return;
                }

                if (error?.response?.data['code']) {
                    console.debug(error.response.data);

                    this.errorFunction(new ResponseError(error.response.data));
                } else {
                    this.enqueueSnackbar('Unknown error', { variant: 'error' });
                    console.error(error);
                }
            })
            .finally(() => {
                this.finishFunction();
            });
    }
}
