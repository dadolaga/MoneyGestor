export function sendDateToBackEnd(date: Date): string {
    let newDate = new Date(date);

    newDate.setMinutes(date.getMinutes() - date.getTimezoneOffset());

    return newDate.toISOString();
}

export function convertToReturnDate(date: Date): string {
    let newDate = new Date(date);

    newDate.setMinutes(date.getMinutes() - date.getTimezoneOffset());

    return newDate.toISOString().split('T')[0];
}