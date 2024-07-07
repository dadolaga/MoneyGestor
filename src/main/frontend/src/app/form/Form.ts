export interface FormSettings {
    name: string,
    checks: Check[],
}

export interface Check {
    action: (value: string) => boolean,
    text: string,
}

export class Form {
    private _values: string[];
    private _errors: string[];
    private _settings: FormSettings[];

    constructor(settings: FormSettings[], values?: string[], errors?: string[]) {
        this._values = values ?? []; 
        this._errors = errors ?? []; 
        this._settings = settings;
    }

    public setValue(name: string, value: string): Form {
        this._values[name] = value;
        
        return new Form(this._settings, this._values, this._errors);
    }

    public getValue(name: string): string {        
        return this._values[name];
    }

    public getError(name: string): string {
        return this._errors[name];
    }

    public haveError(name: string): boolean {
        return this.getError(name) != undefined;
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
}

export const BaseChecker = {
    isEmpty: (value: string): boolean => {
        return value === undefined || value.trim().length == 0;
    },

    isNotNumber: (value: string): boolean => {
        return !/^[\d]+(?:[.,][\d]+)?$/gm.test(value);
    }
}