import type { ComponentType, HTMLAttributes } from 'react';

import { Icon } from '@iconify/react';

import { cn } from '@/lib/utils';

type IconComponentProps = HTMLAttributes<HTMLSpanElement> & {
    strokeWidth?: number | string;
};

export type IconComponent = ComponentType<IconComponentProps>;

function createIcon(icon: string, displayName: string): IconComponent {
    const IconComponent = ({ className, strokeWidth, ...props }: IconComponentProps) => (
        <span
            {...props}
            className={cn('inline-flex shrink-0', className)}
            role={props['aria-label'] === undefined ? undefined : 'img'}
        >
            <Icon aria-hidden="true" className="size-full" icon={icon} strokeWidth={strokeWidth} />
        </span>
    );
    IconComponent.displayName = displayName;
    return IconComponent;
}

export const AlertCircle = createIcon('lucide:circle-alert', 'AlertCircle');
export const ArrowDown = createIcon('lucide:arrow-down', 'ArrowDown');
export const ArrowDownLeft = createIcon('lucide:arrow-down-left', 'ArrowDownLeft');
export const ArrowLeft = createIcon('lucide:arrow-left', 'ArrowLeft');
export const ArrowLeftRight = createIcon('lucide:arrow-left-right', 'ArrowLeftRight');
export const ArrowRight = createIcon('lucide:arrow-right', 'ArrowRight');
export const ArrowRightLeft = createIcon('lucide:arrow-right-left', 'ArrowRightLeft');
export const ArrowUp = createIcon('lucide:arrow-up', 'ArrowUp');
export const ArrowUpDown = createIcon('lucide:arrow-up-down', 'ArrowUpDown');
export const ArrowUpRight = createIcon('lucide:arrow-up-right', 'ArrowUpRight');
export const Banknote = createIcon('lucide:banknote', 'Banknote');
export const BarChart3 = createIcon('lucide:chart-no-axes-column', 'BarChart3');
export const Bell = createIcon('lucide:bell', 'Bell');
export const CalendarIcon = createIcon('lucide:calendar', 'CalendarIcon');
export const ChartNoAxesColumnIncreasing = createIcon(
    'lucide:chart-no-axes-column-increasing',
    'ChartNoAxesColumnIncreasing',
);
export const Check = createIcon('lucide:check', 'Check');
export const ChevronDown = createIcon('lucide:chevron-down', 'ChevronDown');
export const ChevronLeft = createIcon('lucide:chevron-left', 'ChevronLeft');
export const ChevronRight = createIcon('lucide:chevron-right', 'ChevronRight');
export const ChevronUp = createIcon('lucide:chevron-up', 'ChevronUp');
export const CircleDashed = createIcon('lucide:circle-dashed', 'CircleDashed');
export const CircleDollarSign = createIcon('lucide:circle-dollar-sign', 'CircleDollarSign');
export const CreditCard = createIcon('lucide:credit-card', 'CreditCard');
export const EllipsisVertical = createIcon('lucide:ellipsis-vertical', 'EllipsisVertical');
export const FileText = createIcon('lucide:file-text', 'FileText');
export const Grid2X2 = createIcon('lucide:grid-2x2', 'Grid2X2');
export const Inbox = createIcon('lucide:inbox', 'Inbox');
export const Landmark = createIcon('lucide:landmark', 'Landmark');
export const LayoutDashboard = createIcon('lucide:layout-dashboard', 'LayoutDashboard');
export const List = createIcon('lucide:list', 'List');
export const LoaderCircle = createIcon('lucide:loader-circle', 'LoaderCircle');
export const LogIn = createIcon('lucide:log-in', 'LogIn');
export const LogOut = createIcon('lucide:log-out', 'LogOut');
export const Menu = createIcon('lucide:menu', 'Menu');
export const Moon = createIcon('lucide:moon', 'Moon');
export const PiggyBank = createIcon('lucide:piggy-bank', 'PiggyBank');
export const Plus = createIcon('lucide:plus', 'Plus');
export const RotateCcw = createIcon('lucide:rotate-ccw', 'RotateCcw');
export const Save = createIcon('lucide:save', 'Save');
export const Search = createIcon('lucide:search', 'Search');
export const Star = createIcon('lucide:star', 'Star');
export const Sun = createIcon('lucide:sun', 'Sun');
export const Tag = createIcon('lucide:tag', 'Tag');
export const TrendingDown = createIcon('lucide:trending-down', 'TrendingDown');
export const TrendingUp = createIcon('lucide:trending-up', 'TrendingUp');
export const UserPlus = createIcon('lucide:user-plus', 'UserPlus');
export const Wallet = createIcon('lucide:wallet', 'Wallet');
export const WalletCards = createIcon('lucide:wallet-cards', 'WalletCards');
export const X = createIcon('lucide:x', 'X');
