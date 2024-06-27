export interface Response<T> {
    code: number,
    content: T,
    type: string,
}

export interface LoginForm {
    username: string,
    password: string,
}

export interface User {
    lastname: string,
    firstname: string,
    token: string,
    expireToken: Array<number>,
}

export interface UserRegistrationForm {
    lastname: string;
    firstname: string;
    username: string;
    email: string;
    password: string;
    confirm: string;
}

export interface ReceiveId {
    id: number,
}