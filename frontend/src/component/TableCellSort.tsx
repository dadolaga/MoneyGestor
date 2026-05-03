import type { TableCellProps } from '@mui/material';
import { TableCell, TableSortLabel } from '@mui/material';

import { useSort } from '@/context/SortTableContext';

interface IProps extends TableCellProps {
    name: string;
}

export default function TableCellSort(props: IProps) {
    const { sort, clickOnRow } = useSort();

    return (
        <TableCell {...props}>
            <TableSortLabel
                active={sort[props.name] !== undefined}
                direction={sort[props.name]}
                onClick={() => clickOnRow(props.name)}
            >
                {props.children}
            </TableSortLabel>
        </TableCell>
    );
}
