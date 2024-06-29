import { useRouter } from "next/navigation";
import { LoginForm, ReceiveId as ReceiveId, Response, User, UserRegistrationForm } from "../Utilities/BackEndTypes"
import axios from "../axios/axios"
import { ResponseError } from "./ResponseError";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { EnqueueSnackbar, useSnackbar } from 'notistack';
import { useEffect, useState } from "react";

const ERROR_BASE_TYPE = "ERROR";

export function useRestApi() {
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();
    const router = useRouter();

    return new Request(router, enqueueSnackbar);
}

export class Request {
    public router: AppRouterInstance = null;
    public enqueueSnackbar: EnqueueSnackbar = null;

    public User = {
        Registration: async (registration: UserRegistrationForm) => {
            return this.baseRequestPost("user/registration", registration)
            .then(response => response as ReceiveId)
        },

        Login: async (loginForm: LoginForm): Promise<User> => {
            return this.baseRequestPost("user/login", loginForm)
            .then(response => response as User)
        }
    }

    public constructor(router: AppRouterInstance, enqueueSnackbar: EnqueueSnackbar) {
        this.router = router;
        this.enqueueSnackbar = enqueueSnackbar;
    }

    public static ErrorGestor = (options?: CodeAction[]): (error: ResponseError) => void => {
        return (error) => {
            if(error instanceof ResponseError) {                
                if(options) {
                    let codeAction = options.find(codeAction => codeAction.code == error.code);

                    if(codeAction) {
                        codeAction.action(error);
                        return;
                    }
                }
            }
        };
    }

    private async baseRequestPost(url: string, data: any): Promise<any> {
        return axios
            .post(url, data)
            .then(axiosResponse => {
                const myResponse = axiosResponse.data as any as Response<any>;
    
                if(myResponse.code && myResponse.code == 1) {
                    return myResponse.content;
                } else if(myResponse.type != ERROR_BASE_TYPE) {
                    throw new ResponseError(myResponse.code, myResponse.content);
                } else {
                    Request.printServerError("response is not a recognized response")
                }
            })
            .catch(error => {
                if(error.code == "ERR_NETWORK") {
                    this.router.push("dashboard/error/unavailable");
                    throw new Error;
                }

                if (error.response.status == 500) {
                    Request.printServerError("Server return 500");
                    throw new Error;
                }
                
                const response = error.response.data as any as Response<any>;
    
                if(response.type == ERROR_BASE_TYPE) {
                    this.basicErrorGestor(response);
                    throw new ResponseError(response.code, response.content);
                } else 
                    Request.printServerError("Response is not a error or type is not recognized");
            })
    }

    private basicErrorGestor(errorResponse: Response<any>) {
        switch (errorResponse.code) {
            case 100: // Illegal argument
                Request.printServerError("Illegal argument: " + errorResponse.content);
        }
    }

    private static printServerError = (message?: string) => {
        console.error("SERVER ERROR:", message);
    }
}

interface CodeAction {
    code: number,
    action: (_: ResponseError) => void,
}

