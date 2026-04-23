export function convertColor(value: number) {
    if (value < 0) {
        value = 0;
    }

    return `#${value.toString(16).padStart(6, '0').toUpperCase()}`;
}

export const getAdaptiveBackground = (hexColor: string): string => {
    // 1. Pulizia: rimuove spazi e il cancelletto iniziale
    let cleanHex = hexColor.trim().replace('#', '');

    // 2. Espansione: gestisce il formato corto (es. "F00" -> "FF0000")
    if (cleanHex.length === 3) {
        cleanHex = cleanHex
            .split('')
            .map((char) => char + char)
            .join('');
    }

    // 3. Validazione: se non è un esadecimale valido di 6 cifre, torna un grigio neutro
    const hexRegex = /^[0-9A-Fa-f]{6}$/;
    if (!hexRegex.test(cleanHex)) {
        console.warn(`Colore non valido fornito: ${hexColor}`);
        return '#F8F9FA'; // Fallback sicuro
    }

    // 4. Estrazione dei canali RGB
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    // 5. Calcolo Luminosità (Formula WCAG)
    // Il risultato è un valore tra 0 (nero) e 255 (bianco)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // 6. Definizione sfumature "soft"
    const softDark = '#1A1A1B'; // Un nero meno aggressivo, tipo interfaccia moderna
    const softLight = '#FDFDFD'; // Un bianco quasi perfetto, ma più riposante

    // Se il testo è luminoso (>128), metto sfondo scuro. Altrimenti sfondo chiaro.
    return brightness > 128 ? softDark : softLight;
};
