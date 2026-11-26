import type { IconComponent } from '@/components/ui/icons';

export function MarketingIcon({ icon: Icon, tone = 'brand' }: { icon: IconComponent; tone?: 'brand' | 'blue' | 'green' }) {
    return <span className={`marketing-icon marketing-icon--${tone}`}><Icon aria-hidden="true" /></span>;
}
