import { useCookies } from 'react-cookie';
import axios from '../app/axios/axios';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Login, User } from '../models/backend';
import { EnqueueSnackbar, useSnackbar } from 'notistack';
import { useCallback } from 'react';

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

    const request = useCallback(<T>(type: 'POST' | 'GET', url: string, data?: any): Promise<AxiosResponse<Response<T>>>  => {
        let axiosConfig: AxiosRequestConfig<any> = {
            data: data,
            headers: cookie && {
                Authorization: cookie.token,
            },
        };

        switch (type) {
            case 'POST':
                return axios.post(url, data, axiosConfig);
            case 'GET':
                return axios.get(url, axiosConfig);
        }
    }, [cookie]);

    return {
        user: {
            add: (user: User) =>
                new ApiRequest<number>(() => request<number>('POST', '/user/add', user), enqueueSnackbar),

            login: (login: Login) =>
                new ApiRequest<string>(() => request<string>('POST', '/user/login', login), enqueueSnackbar),

            info: () => new ApiRequest<User>(() => request<User>('GET', '/user/info'), enqueueSnackbar),
        },
    };
}

class ApiRequest<T_RETURN> {
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
                    this.successFunction(response.data);
                }
            })
            .catch((error) => {
                if (error.code === 'ERR_NETWORK') {
                    this.enqueueSnackbar('Server error', { variant: 'error' });
                    console.error(error);
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
