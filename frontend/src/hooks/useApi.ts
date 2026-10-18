import { useCallback, useMemo } from 'react';

import type { AxiosInstance, AxiosResponse } from 'axios';
import axios from 'axios';
import { useTranslations } from 'next-intl';

import type { AccountConfiguration } from '@/lib/api/client';
import { notify } from '@/lib/notifications';
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
    const t = useTranslations('Common.notifications');
    const notifyRequestError = useCallback(
        (error: AccountResponseError) => {
            let key = 'requestFailed';
            if (error.message === 'network_error') key = 'networkError';
            else if (error.status === 401) key = 'sessionExpired';
            else if (error.status === 403) key = 'forbidden';
            else if (error.status === 429) key = 'tooManyRequests';
            notify.error(t(key));
        },
        [t],
    );

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
                    notifyRequestError,
                ),
            login: (login: Login) =>
                new AccountApiRequest<void>(
                    () => accountRequest<void>('POST', '/api/v1/auth/login', login),
                    notifyRequestError,
                ),
            session: () =>
                new AccountApiRequest<AccountProfile>(
                    () => accountRequest<AccountProfile>('GET', '/api/v1/auth/session'),
                    notifyRequestError,
                ),
            logout: () =>
                new AccountApiRequest<void>(
                    () => accountRequest<void>('POST', '/api/v1/auth/logout'),
                    notifyRequestError,
                ),
            forgotPassword: (email: string) =>
                new AccountApiRequest<void>(
                    () => accountRequest<void>('POST', '/api/v1/auth/forgot-password', { email }),
                    notifyRequestError,
                ),
            resendConfirmation: (email: string) =>
                new AccountApiRequest<void>(
                    () => accountRequest<void>('POST', '/api/v1/auth/resend-confirmation', { email }),
                    notifyRequestError,
                ),
            resetPassword: (email: string, token: string, password: string) =>
                new AccountApiRequest<void>(
                    () => accountRequest<void>('POST', '/api/v1/auth/reset-password', { email, token, password }),
                    notifyRequestError,
                ),
            confirmEmail: (userId: string, token: string) =>
                new AccountApiRequest<void>(
                    () => accountRequest<void>('POST', '/api/v1/auth/confirm-email', { userId, token }),
                    notifyRequestError,
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
        private readonly onUnhandledError: (_error: AccountResponseError) => void,
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
                if (axios.isCancel(error)) return;

                let responseError = new AccountResponseError(0, 'request_failed');
                if (axios.isAxiosError<{ code?: string }>(error)) {
                    const code = error.response?.data?.code;
                    responseError = new AccountResponseError(
                        error.response?.status ?? 0,
                        typeof code === 'string' ? code : error.response ? 'request_failed' : 'network_error',
                    );
                }
                // A form or page handler owns its error; do not also show a global toast.
                (this.errorFunction ?? this.onUnhandledError)(responseError);
            })
            .finally(this.finishFunction);
    }
}
