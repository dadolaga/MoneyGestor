export interface DashboardCategoryViewModel {
    id: number;
    name: string;
    value: number;
}

export interface DashboardViewModel {
    incoming: number;
    expense: number;
    incomingCategories: DashboardCategoryViewModel[];
    expenseCategories: DashboardCategoryViewModel[];
}
