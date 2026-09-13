import type { ReactNode } from 'react';
import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

function StateCard({ children, role = 'status' }: { children: ReactNode; role?: 'status' | 'alert' }) {
    return (
        <Card role={role}>
            <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                {children}
            </CardContent>
        </Card>
    );
}
export function LoadingState({ label }: { label: string }) {
    return (
        <StateCard>
            <LoaderCircle className="size-7 animate-spin" />
            <span>{label}</span>
        </StateCard>
    );
}
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
    return (
        <StateCard>
            <Inbox className="size-7" />
            <div>
                <p className="m-0 font-medium text-foreground">{title}</p>
                <p className="m-0 text-sm">{description}</p>
            </div>
            {action}
        </StateCard>
    );
}
export function ErrorState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
    return (
        <StateCard role="alert">
            <AlertCircle className="size-7 text-destructive" />
            <div>
                <p className="m-0 font-medium text-foreground">{title}</p>
                <p className="m-0 text-sm">{description}</p>
            </div>
            {action}
        </StateCard>
    );
}
