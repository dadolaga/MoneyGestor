import { useCallback, useMemo } from 'react';

import type { AxiosInstance, AxiosResponse } from 'axios';
import axios from 'axios';
import type { EnqueueSnackbar } from 'notistack';
import { useSnackbar } from 'notistack';

import type { AccountConfiguration } from '@/lib/api/client';
import type { Login, User } from '@/models/backend';

export interface AccountRegistrationResponse extends AccountConfiguration {
    message: string;
}

export interface AccountProfile {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    username: string;
}

export class AccountResponseError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export default function useApi() {
    const { enqueueSnackbar } = useSnackbar();

    const myAxios = useMemo<AxiosInstance>(() => {
        const instance = axios.create({
            baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5256',
            withCredentials: true,
        });

        return instance;
    }, []);

    const accountRequest = useCallback(
        async <T>(method: 'POST' | 'GET', url: string, data?: object): Promise<AxiosResponse<T>> => {
            if (method === 'GET') return myAxios.get<T>(url);

            const tokenResponse = await myAxios.get<{ token: string }>('/api/v1/auth/antiforgery');
            return myAxios.post<T>(url, data, { headers: { 'X-CSRF-TOKEN': tokenResponse.data.token } });
        },
        [myAxios],
    );

    return {
        account: {
            register: (user: User) =>
                new AccountApiRequest<AccountRegistrationResponse>(
                    () => accountRequest<AccountRegistrationResponse>('POST', '/api/v1/auth/register', user),
                    enqueueSnackbar,
                ),
            login: (login: Login) =>
                new AccountApiRequest<void>(
                    () => accountRequest<void>('POST', '/api/v1/auth/login', login),
                    enqueueSnackbar,
                ),
            session: () =>
                new AccountApiRequest<AccountProfile>(
                    () => accountRequest<AccountProfile>('GET', '/api/v1/auth/session'),
                    enqueueSnackbar,
                ),
            logout: () =>
                new AccountApiRequest<void>(
                    () => accountRequest<void>('POST', '/api/v1/auth/logout'),
                    enqueueSnackbar,
                ),
            forgotPassword: (email: string) =>
                new AccountApiRequest<void>(
                    () => accountRequest<void>('POST', '/api/v1/auth/forgot-password', { email }),
                    enqueueSnackbar,
                ),
            resendConfirmation: (email: string) =>
                new AccountApiRequest<void>(
                    () => accountRequest<void>('POST', '/api/v1/auth/resend-confirmation', { email }),
                    enqueueSnackbar,
                ),
            resetPassword: (email: string, token: string, password: string) =>
                new AccountApiRequest<void>(
                    () => accountRequest<void>('POST', '/api/v1/auth/reset-password', { email, token, password }),
                    enqueueSnackbar,
                ),
            confirmEmail: (userId: string, token: string) =>
                new AccountApiRequest<void>(
                    () => accountRequest<void>('POST', '/api/v1/auth/confirm-email', { userId, token }),
                    enqueueSnackbar,
                ),
        },
    };
}

export class AccountApiRequest<T_RETURN> {
    private successFunction: (_data: T_RETURN) => void = () => {};
    private errorFunction?: (_error: AccountResponseError) => void;
    private finishFunction: () => void = () => {};

    constructor(
        private readonly actionFunction: () => Promise<AxiosResponse<T_RETURN>>,
        private readonly enqueueSnackbar: EnqueueSnackbar,
    ) {}

    onSuccess(callback: (data: T_RETURN) => void) {
        this.successFunction = callback;
        return this;
    }

    onError(callback: (error: AccountResponseError) => void) {
        this.errorFunction = callback;
        return this;
    }

    onFinish(callback: () => void) {
        this.finishFunction = callback;
        return this;
    }

    execute() {
        this.actionFunction()
            .then((response) => this.successFunction(response.data))
            .catch((error: unknown) => {
                if (!axios.isAxiosError<{ code?: string }>(error)) {
                    this.errorFunction?.(new AccountResponseError(0, 'request_failed'));
                    return;
                }
                const status = error.response?.status ?? 0;
                const code = error.response?.data?.code;
                if (error.code === 'ERR_NETWORK' && !this.errorFunction) {
                    this.enqueueSnackbar('Server error', { variant: 'error' });
                }
                this.errorFunction?.(new AccountResponseError(status, typeof code === 'string' ? code : 'request_failed'));
            })
            .finally(this.finishFunction);
    }
}
