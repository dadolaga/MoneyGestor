import { useCookies } from 'react-cookie';
import axios from '../app/axios/axios';
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { User } from '../models/backend';
import { useSnackbar } from 'notistack';

export interface Response {
    code: number;
    message: string;
    data?: any;
}

export class ResponseError extends Error {
    data: Response;

    constructor(data: Response) {
        super(data.message);
        this.data = data;
    }
}

export default function useApi() {
    const [cookie] = useCookies(['_token']);
    const { enqueueSnackbar } = useSnackbar();

    function request<T>(type: 'POST' | 'GET', url: string, data?: any): Promise<T | void> {
        let axiosPromise: Promise<AxiosResponse<any, any>>;
        let axiosConfig: AxiosRequestConfig<any> = {
            data: data,
            headers: cookie && {
                Authorization: cookie._token,
            },
        };

        switch (type) {
            case 'POST':
                axiosPromise = axios.post(url, data, axiosConfig);
                break;
            case 'GET':
                axiosPromise = axios.get(url, axiosConfig);
                break;
        }

        return axiosPromise
            .then((axiosResponse) => {
                const response: Response = axiosResponse.data;
                console.debug(response);

                if (response.code === 0) {
                    return response.data as T;
                }
            })
            .catch((error: AxiosError) => {
                if (error.response.data['code']) {
                    console.debug(error.response.data);

                    throw new ResponseError({
                        code: error.response.data['code'],
                        message: error.response.data['message'],
                    });
                }

                enqueueSnackbar('Unknown error', { variant: 'error' });
                console.error(error);
            });
    }

    return {
        user: {
            add: (user: User) => request<number>('POST', '/user/add', user),
        },
    };
}
