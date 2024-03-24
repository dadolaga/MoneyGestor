export function convertNumberToValue(number: number): string {
    return new Intl.NumberFormat('it-IT', {
        style: "currency",
        currency: "EUR"
    }).format(number);
}