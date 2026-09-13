import { FeatureStateBoundary } from '@/components/shared/feature-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FeatureState } from '@/types/feature-state';

import type { DashboardViewModel } from './model';

interface DashboardPreviewProps {
    state: FeatureState<DashboardViewModel>;
    labels: {
        incoming: string;
        expense: string;
        categories: string;
        states: { idle: string; loading: string; empty: string; error: string };
    };
    formatMoney: (value: number) => string;
}

export function DashboardPreview({ state, labels, formatMoney }: DashboardPreviewProps) {
    return (
        <FeatureStateBoundary state={state} labels={labels.states}>
            {(dashboard) => (
                <div className="grid gap-3 sm:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm text-muted-foreground">{labels.incoming}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-2xl font-semibold tabular-nums text-income">
                            {formatMoney(dashboard.incoming)}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm text-muted-foreground">{labels.expense}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-2xl font-semibold tabular-nums text-expense">
                            {formatMoney(dashboard.expense)}
                        </CardContent>
                    </Card>
                    <Card className="sm:col-span-2">
                        <CardHeader>
                            <CardTitle>{labels.categories}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2 sm:grid-cols-2">
                            {[...dashboard.expenseCategories, ...dashboard.incomingCategories].map((category) => (
                                <div
                                    key={category.id}
                                    className="flex justify-between gap-4 rounded-md bg-muted px-3 py-2 text-sm"
                                >
                                    <span>{category.name}</span>
                                    <span className="tabular-nums">{formatMoney(category.value)}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}
        </FeatureStateBoundary>
    );
}
