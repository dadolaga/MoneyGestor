import { ArrowLeftRight, Briefcase, Car, Gamepad2, Heart, House, ShoppingCart, Tag, Utensils, Zap } from '@/components/ui/icons';
import type { IconComponent } from '@/components/ui/icons';
import type { ApiTransactionType } from '@/lib/api/client';

export const categoryIcons: Record<string, IconComponent> = {
    shopping: ShoppingCart, home: House, transport: Car, food: Utensils, utilities: Zap,
    work: Briefcase, entertainment: Gamepad2, health: Heart, tag: Tag,
};

export const categoryColors: Record<string, string> = {
    red: 'var(--primary)', orange: 'var(--chart-4)', yellow: 'var(--warning)', green: 'var(--income)',
    cyan: 'var(--chart-6)', blue: 'var(--transfer)', purple: 'var(--chart-5)', grey: 'var(--muted-foreground)',
};

export function CategoryIcon({ type }: { type: ApiTransactionType }) {
    const transfer = type.systemKind === 'Transfer';
    const Icon = transfer ? ArrowLeftRight : categoryIcons[type.icon] ?? Tag;
    return <Icon aria-hidden="true" style={{ color: transfer ? 'var(--transfer)' : categoryColors[type.color] ?? categoryColors.grey }} />;
}
