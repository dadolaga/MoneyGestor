import { useSort } from '@/context/SortTableContext';
import { TableCell, TableCellProps, TableSortLabel } from '@mui/material';

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
