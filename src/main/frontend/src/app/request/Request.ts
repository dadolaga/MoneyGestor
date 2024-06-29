import { useRouter } from "next/navigation";
import { CreateWalletForm, LoginForm, ReceiveId as ReceiveId, Response, User, UserRegistrationForm, Wallet } from "../Utilities/BackEndTypes"
import axios from "../axios/axios"
import { ResponseError } from "./ResponseError";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { EnqueueSnackbar, useSnackbar } from 'notistack';
import { useCookies } from "react-cookie";
import { AxiosRequestConfig, AxiosResponse } from "axios";

const ERROR_BASE_TYPE = "ERROR";

export function useRestApi() {
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();
    const router = useRouter();    
    const [cookie, setCookie] = useCookies(["_token"]);

    return new Request(router, enqueueSnackbar, cookie);
}

export class Request {
    public router: AppRouterInstance = null;
    public enqueueSnackbar: EnqueueSnackbar = null;
    public cookie: {_token?: any} = null;

    public User = {
        Registration: async (registration: UserRegistrationForm): Promise<ReceiveId> => {
            return this.baseRequestPost("user/registration", registration)
            .then(response => response as ReceiveId)
        },

        Login: async (loginForm: LoginForm): Promise<User> => {
            return this.baseRequestPost("user/login", loginForm)
            .then(response => response as User)
        }
    }

    public Wallet = {
        Create: async (wallet: CreateWalletForm): Promise<ReceiveId> => {
            return this.baseRequestPost("wallet/new", wallet)
            .then(response => response as ReceiveId)
        },
        
        List: async (): Promise<Wallet[]> => {
            return this.baseRequestGet("wallet/list")
            .then(response => response as Wallet[])
        }
    }

    public constructor(router: AppRouterInstance, enqueueSnackbar: EnqueueSnackbar, cookie: {_token?: any}) {
        this.router = router;
        this.enqueueSnackbar = enqueueSnackbar;
        this.cookie = cookie;
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
        return this.baseRequest(true, url, data);
    }

    private async baseRequestGet(url: string): Promise<any> {
        return this.baseRequest(false, url);
    }

    private async baseRequest(isPost: boolean, url: string, data?: any): Promise<any> {
        let axiosPromise: Promise<AxiosResponse<any, any>>;
        let axiosConfig: AxiosRequestConfig<any> = {
            headers: this.cookie._token && {
                Authorization: this.cookie._token
            }
        };

        if(isPost) {
            axiosPromise = axios.post(url, data, axiosConfig);
        } else {
            axiosPromise = axios.get(url, axiosConfig);
        }

        return axiosPromise
            .then(axiosResponse => {
                const myResponse = axiosResponse.data as any as Response<any>;
    
                if(myResponse.code && myResponse.code == 1) {
                    return myResponse.content;
                } else if(myResponse.type && myResponse.type != ERROR_BASE_TYPE) {
                    throw new ResponseError(myResponse.code, myResponse.content);
                } else {
                    Request.printServerError("response is not a recognized response");
                }
            })
            .catch(error => {
                if(error.code == "ERR_NETWORK") {
                    this.router.push("dashboard/error/unavailable");
                }

                if (error.response.status == 500) {
                    Request.printServerError("Server return 500");
                }
                
                const response = error.response.data as any as Response<any>;
    
                if(response.type == ERROR_BASE_TYPE) {
                    this.basicErrorGestor(response);
                    throw new ResponseError(response.code, response.content);
                } else {
                    Request.printServerError("Response is not a error or type is not recognized");
                }
            })
    }

    private basicErrorGestor(errorResponse: Response<any>) {
        switch (errorResponse.code) {
            case 100: // Illegal argument
                Request.printServerError("Illegal argument: " + errorResponse.content);
                break;
            case 104:
                this.enqueueSnackbar("Sessione scaduta", {variant: "info"});
                this.router.push("/dashboard/user/login");
                break;
        }
    }

    private static printServerError = (message?: string) => {
        console.error("SERVER ERROR:", message);
        throw new Error;
    }
}

interface CodeAction {
    code: number,
    action: (_: ResponseError) => void,
}

