export interface ICheckForm {
    value: string | number,
    functionSetText: (any) => void,
    check: ICheck[],
}

interface ICheck {
    regex?: RegExp,
    checkFunction?: ((string) => boolean) | ((number) => boolean),
    checkEmpty?: boolean
    errorText: string,
}

export function checkForm(data: ICheckForm[]): boolean {
    let thereIsError: boolean = false;

    data.forEach((value) => {
        value.functionSetText(null);

        for(let i=0; i<value.check.length; i++) {
            if((value.check[i].regex != null && !value.check[i].regex.test(value.value.toString())) || 
            (value.check[i].checkFunction != null && value.check[i].checkFunction(value.value)) ||
            (value.check[i].checkEmpty === true && (value.value == null || (typeof(value.value) == "string" && value.value.trim().length == 0)))) {
                value.functionSetText(value.check[i].errorText);
                thereIsError = true;
                return;
            }
        }
    })

    return thereIsError;
}