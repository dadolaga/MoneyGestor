import React, { useCallback, useEffect, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import {
    Box,
    Button,
    Typography,
    Stack,
    Popover,
    TextField,
    InputAdornment,
    IconButton,
    styled,
    FormControl,
    useTheme,
    Theme,
    alpha,
    FormControlOwnProps,
} from '@mui/material';
import {
    LocalizationProvider,
    PickersDay,
    PickersDayProps,
    PickersCalendarHeaderProps,
    usePickerAdapter,
} from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendar } from '@fortawesome/free-regular-svg-icons';
import 'dayjs/locale/it';
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { DayCalendar } from '@mui/x-date-pickers/internals';

export interface DateRange {
    start: Dayjs;
    end: Dayjs;
}

const CustomDay = styled(PickersDay, {
    shouldForwardProp: (prop) => !['isSelectedStart', 'isSelectedEnd', 'isDayBetween'].includes(prop as string),
})<{ theme: Theme; isSelectedStart: boolean; isSelectedEnd: boolean; isDayBetween: boolean }>(
    ({ theme, isSelectedStart, isSelectedEnd, isDayBetween }) => ({
        ...(isSelectedStart && {
            backgroundColor: `${theme.palette.primary.main}`,
            color: theme.palette.primary.contrastText,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
        }),
        ...(isSelectedEnd && {
            backgroundColor: `${theme.palette.primary.main}`,
            color: theme.palette.primary.contrastText,
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
        }),
        ...(isDayBetween && {
            backgroundColor: alpha(theme.palette.secondary.main, 0.2),
            color: theme.palette.secondary.contrastText,
            borderRadius: 0,
        }),
        ...(isSelectedStart && isSelectedEnd && { borderRadius: '50% !important' }),
    }),
);

interface PickerProps {
    startDate: Dayjs | null;
    endDate: Dayjs | null;
    onChange: (start: Dayjs | null, end: Dayjs | null) => void;
    shortcuts?: Shortcut[];
}

interface Shortcut {
    label: string;
    getValue: () => [Dayjs, Dayjs];
}

const PickerContent = ({ startDate, endDate, onChange, shortcuts }: PickerProps) => {
    const theme = useTheme();
    const [direction, setDirection] = useState<'left' | 'right'>('left');
    const [currentMonth, setCurrentMonth] = useState<Dayjs>(startDate || dayjs());

    useEffect(() => {
        console.log('currentMonth updated:', currentMonth.format('YYYY-MM-DD'));
    }, [currentMonth]);

    const handleDayClick = (date: Dayjs) => {
        if (!startDate || (startDate && endDate)) {
            onChange(date, null);
        } else {
            date.isBefore(startDate) ? onChange(date, startDate) : onChange(startDate, date);
        }
    };

    const moveMonthHandler = useCallback(
        (direction: 'left' | 'right') => (event) => {
            setDirection(direction);
            setCurrentMonth((date) => dayjs(date).add(direction === 'right' ? 1 : -1, 'month'));
        },
        [],
    );

    const renderDay = (props: PickersDayProps) => {
        const { day } = props;

        const isStart = !!startDate && day.isSame(startDate, 'day');
        const isEnd = !!endDate && day.isSame(endDate, 'day');
        const isBetween = !!startDate && !!endDate && day.isAfter(startDate, 'day') && day.isBefore(endDate, 'day');

        return (
            <CustomDay
                {...props} // Pass all original props through
                theme={theme}
                isSelectedStart={isStart}
                isSelectedEnd={isEnd}
                isDayBetween={isBetween}
                onClick={() => handleDayClick(day)}
            />
        );
    };

    return (
        <Box sx={{ p: 3, display: 'inline-block' }}>
            <Stack direction="row" spacing={3}>
                <Stack spacing={1} sx={{ width: 130, pt: 8 }}>
                    {(shortcuts || []).map((shortcut) => (
                        <Button
                            key={shortcut.label}
                            variant="contained"
                            size="small"
                            onClick={() => {
                                const [start, end] = shortcut.getValue();
                                onChange(start, end);
                            }}
                        >
                            {shortcut.label}
                        </Button>
                    ))}
                </Stack>

                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
                    <Box>
                        <Box>
                            <Typography
                                sx={{ textTransform: 'uppercase' }}
                                fontSize={10}
                                color={theme.palette.text.disabled}
                            >
                                Select date range
                            </Typography>
                            <Box display="flex" gap={1.25} alignItems="baseline">
                                <Typography>{startDate?.format('MMM D')}</Typography>
                                <Typography fontSize={24}>-</Typography>
                                <Typography>{endDate?.format('MMM D')}</Typography>
                            </Box>
                        </Box>
                        <Stack direction="row">
                            <Box
                                p={1}
                                sx={{ borderRight: `1px solid ${theme.palette.divider}` }}
                                display="flex"
                                flexDirection="column"
                            >
                                <Box display="flex" alignItems="baseline" justifyContent="space-between">
                                    <Box width="30px">
                                        <IconButton size="small" onClick={moveMonthHandler('left')}>
                                            <FontAwesomeIcon icon={faArrowLeft} />
                                        </IconButton>
                                    </Box>
                                    <Typography>{currentMonth.locale('it').format('MMMM')}</Typography>
                                    <Box width="30px" />
                                </Box>
                                <DayCalendar
                                    currentMonth={currentMonth}
                                    disableFuture={false}
                                    disablePast={false}
                                    focusedDay={dayjs().add(1, 'day')}
                                    hasFocus
                                    isMonthSwitchingAnimating={false}
                                    maxDate={dayjs().add(1, 'year')}
                                    minDate={dayjs().add(-1, 'year')}
                                    onFocusedDayChange={() => {}}
                                    onSelectedDaysChange={handleDayClick}
                                    onMonthSwitchingAnimationEnd={() => {}}
                                    reduceAnimations={false}
                                    selectedDays={[startDate, endDate]}
                                    slideDirection={direction === 'right' ? 'left' : 'right'}
                                    timezone={dayjs.tz.guess()}
                                    slots={{ day: renderDay }}
                                />
                            </Box>

                            <Box p={1} display="flex" flexDirection="column">
                                <Box display="flex" alignItems="baseline" justifyContent="space-between">
                                    <Box width="30px" />
                                    <Typography>{currentMonth.add(1, 'month').locale('it').format('MMMM')}</Typography>
                                    <Box width="30px">
                                        {' '}
                                        <IconButton size="small" onClick={moveMonthHandler('right')}>
                                            <FontAwesomeIcon icon={faArrowRight} />
                                        </IconButton>
                                    </Box>
                                </Box>
                                <DayCalendar
                                    currentMonth={currentMonth.add(1, 'month')}
                                    disableFuture={false}
                                    disablePast={false}
                                    focusedDay={dayjs().add(1, 'day')}
                                    hasFocus
                                    isMonthSwitchingAnimating={false}
                                    maxDate={dayjs().add(1, 'year')}
                                    minDate={dayjs().add(-1, 'year')}
                                    onFocusedDayChange={() => {}}
                                    onSelectedDaysChange={handleDayClick}
                                    onMonthSwitchingAnimationEnd={() => {}}
                                    reduceAnimations={false}
                                    selectedDays={[startDate, endDate]}
                                    slideDirection={direction === 'right' ? 'left' : 'right'}
                                    timezone={dayjs.tz.guess()}
                                    slots={{ day: renderDay }}
                                />
                            </Box>
                        </Stack>
                    </Box>
                </LocalizationProvider>
            </Stack>
        </Box>
    );
};

export interface RangePickerProps extends FormControlOwnProps {
    date: DateRange;
    onDateChange: (date: DateRange) => void;
}

export default function RangePickerField(props: RangePickerProps) {
    const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);

    const formattedRange =
        props.date?.start && props.date?.end
            ? `${props.date?.start.format('DD/MM/YYYY')} – ${props.date?.end ? props.date?.end.format('DD/MM/YYYY') : '...'}`
            : 'Select date range';

    return (
        <FormControl fullWidth {...props}>
            {/* The "Input" Trigger */}
            <TextField
                label="Date Range"
                value={formattedRange}
                onClick={handleClick}
                size="small"
                slotProps={{
                    input: {
                        readOnly: true,
                        startAdornment: (
                            <InputAdornment position="start">
                                <FontAwesomeIcon icon={faCalendar} />
                            </InputAdornment>
                        ),
                    },
                }}
                autoComplete="off"
                sx={{ cursor: 'pointer', '& input': { cursor: 'pointer' } }}
            />

            {/* The Dropdown Popover */}
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 1,
                            borderRadius: 2,
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                        },
                    },
                }}
            >
                <PickerContent
                    startDate={props.date?.start}
                    endDate={props.date?.end}
                    onChange={(s, e) => {
                        props.onDateChange({ start: s, end: e });
                    }}
                />
            </Popover>
        </FormControl>
    );
}
