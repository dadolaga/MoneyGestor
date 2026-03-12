export function convertColor(value: number) {
    if (value < 0) {
        value = 0;
    }

    return `#${value.toString(16).padStart(6, '0').toUpperCase()}`;
}