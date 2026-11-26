export function convertNumberToValue(number?: number): string | undefined {
    if (number === undefined) return undefined;

    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
    }).format(number);
}

export function convertNumberToPercentage(number?: number): string | undefined {
    if (number === undefined) return undefined;

    return new Intl.NumberFormat('it-IT', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(number);
}
