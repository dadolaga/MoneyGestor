import dayjs from "dayjs";
import "dayjs/plugin/utc";

export function convertNumberToValue(number: number): string {
    return new Intl.NumberFormat('it-IT', {
        style: "currency",
        currency: "EUR"
    }).format(number);
}

export function convertCsvToObject(text: string, splitter = ';'): object[][] {
    var array = [];

    for(let line of text.split("\r\n")) {
        line = line.trim();

        if(!line || line.length == 0)
            continue;

        const lineObject = [];

        line.split(splitter).forEach(value => {
            lineObject.push(value);
        })

        array.push(lineObject);
    }

    return array;
}

export function convertStringToNumber(text: string): number {
    var replacedText = removeDots(text.replaceAll(/[^\d.,-]/g, "").replaceAll(",", "."));

    return Number.parseFloat(replacedText);

    function removeDots(text: string): string {
        let lastDotIndex = -1;

        for(let i = 0; i < text.length; i++) {
            if(text.charAt(i) == '.') {
                if(lastDotIndex != -1) {
                    text = text.substring(0, lastDotIndex) + text.substring(lastDotIndex + 1);
                    i--;
                }
                lastDotIndex = i;
            }
        }

        return text;
    }
}

export function convertStringToValue(text: string): string {
    return convertNumberToValue(convertStringToNumber(text));
}

export function convertDateStringWithFormat(date: string, format: string): Date {
    return dayjs.utc(date, format).toDate();
}
