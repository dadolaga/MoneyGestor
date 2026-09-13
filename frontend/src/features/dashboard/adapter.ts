import type { DashboardOutput } from '@/models/backend';

import type { DashboardCategoryViewModel, DashboardViewModel } from './model';

function mapCategories(categories: DashboardOutput['incomingCategories']): DashboardCategoryViewModel[] {
    return categories.flatMap(({ type, value }) =>
        type.id === undefined || type.name === undefined ? [] : [{ id: type.id, name: type.name, value }],
    );
}

export function toDashboardViewModel(dto: DashboardOutput): DashboardViewModel {
    return {
        incoming: dto.incoming,
        expense: dto.expense,
        incomingCategories: mapCategories(dto.incomingCategories),
        expenseCategories: mapCategories(dto.expenseCategories),
    };
}
