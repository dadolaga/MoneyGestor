export interface User {
    id?: number,
    firstname?: string,
    lastname?: string,
    email?: string,
    username?: string,
    password?: string,
}

export class Login {
    user: string;
    password: string;
    remember: boolean = false;
}