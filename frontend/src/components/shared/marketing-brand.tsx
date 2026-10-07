import Image from 'next/image';

export function MarketingBrand({ width = 162, priority = false, isLightTheme = false }: { width?: number; priority?: boolean; isLightTheme?: boolean }) {
    return <Image alt="Flowiy" height={Math.round(width * 72 / 229)} priority={priority} src={isLightTheme ? '/new_logo.png' : '/new_logo_dark.png'} width={width} />;
}
