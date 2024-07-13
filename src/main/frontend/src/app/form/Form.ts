import { IFormMultiType } from "../Utilities/Interfaces";

export interface FormSettings {
    name: string,
    checks: Check[],
}

export interface Check {
    action: (value: string) => boolean,
    text: string,
}

export class Form {
    private _values: string[] | IFormMultiType[];
    private _errors: string[];
    private _settings: FormSettings[];

    constructor(settings: FormSettings[], values?: string[] | IFormMultiType[], errors?: string[]) {
        this._values = values ?? []; 
        this._errors = errors ?? []; 
        this._settings = settings;
    }

    public setValue(name: string, value: string | IFormMultiType): Form {
        this._values[name] = value;
        
        return new Form(this._settings, this._values, this._errors);
    }

    public getStringValue(name: string): string {   
        if(typeof(this._values[name]) === "number")
            return "" + this._values[name];

        try {
            return this._values[name]?.getKey() ?? this._values[name];
        } catch (Error) {
            return this._values[name];
        }
    }

    public getValue(name: string): IFormMultiType {        
        return this._values[name] as IFormMultiType;
    }

    public getError(name: string): string {
        return this._errors[name];
    }

    public haveError(name: string): boolean {
        return this.getError(name) != undefined;
    }

    public setManualError(name: string, error: string): Form {
        this._errors[name] = error;

        return new Form(this._settings, this._values, this._errors);
    }

    public setValues(object: any): Form {
        Object.keys(object).forEach(key => {
            this._values[key] = object[key];
        });

        return new Form(this._settings, this._values, this._errors);
    }

    public check(): Form {
        this._settings.forEach(setting => {
            for(const check of setting.checks) {
                this._errors[setting.name] = undefined;
                if(check.action(this._values[setting.name])) {
                    this._errors[setting.name] = check.text;
                    break;
                }
            }
        })

        return new Form(this._settings, this._values, this._errors);
    }

    public isCheckFail(): boolean {
        return Object.values(this._errors).reduce((counter, value) => value != undefined? counter + 1 : counter, 0) != 0
    }
}

export const BaseChecker = {
    isEmpty: (value: string | any): boolean => {
        return value === undefined || (typeof value === 'string' && value.trim().length == 0);
    },

    isNotNumber: (value: string): boolean => {
        return !/^[\d]+(?:[.,][\d]+)?$/gm.test(value);
    }
}