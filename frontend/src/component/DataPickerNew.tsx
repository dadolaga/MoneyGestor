import React, { useCallback, useMemo, useState, memo } from 'react';

import { faCalendar } from '@fortawesome/free-regular-svg-icons';
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import timezonePlugin from 'dayjs/plugin/timezone';
import utcPlugin from 'dayjs/plugin/utc';

import type { Theme, FormControlOwnProps } from '@mui/material';
// eslint-disable-next-line import/order
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
    alpha,
} from '@mui/material';

import 'dayjs/locale/it';

import { LocalizationProvider, PickersDay } from '@mui/x-date-pickers';
import type { PickersDayProps } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DayCalendar } from '@mui/x-date-pickers/internals';

dayjs.extend(utcPlugin);
dayjs.extend(timezonePlugin);

export interface DateRange {
    start?: Dayjs;
    end?: Dayjs;
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

const PickerContent = memo(
    ({ startDate, endDate, onChange, shortcuts }: PickerProps) => {
        const theme = useTheme();
        const [direction, setDirection] = useState<'left' | 'right'>('left');
        const [currentMonth, setCurrentMonth] = useState<Dayjs>(startDate ?? dayjs());

        // Memoize date calculations to avoid recalculation on every render
        const dateConstraints = useMemo(
            () => ({
                minDate: dayjs().add(-1, 'year'),
                maxDate: dayjs().add(1, 'year'),
                focusedDay: dayjs().add(1, 'day'),
            }),
            [],
        );

        const handleDayClick = useCallback(
            (date: Dayjs | null) => {
                if (!startDate || (startDate && endDate)) {
                    onChange(date, null);
                }
            },
            [startDate, endDate, onChange],
        );

        const moveMonthHandler = useCallback(
            (dir: 'left' | 'right') => () => {
                setDirection(dir);
                setCurrentMonth((date) => dayjs(date).add(dir === 'right' ? 1 : -1, 'month'));
            },
            [],
        );

        const renderDay = useCallback(
            (props: PickersDayProps) => {
                const { day } = props;

                const isStart = !!startDate && day.isSame(startDate, 'day');
                const isEnd = !!endDate && day.isSame(endDate, 'day');
                const isBetween =
                    !!startDate && !!endDate && day.isAfter(startDate, 'day') && day.isBefore(endDate, 'day');

                return (
                    <CustomDay
                        {...props}
                        theme={theme}
                        isSelectedStart={isStart}
                        isSelectedEnd={isEnd}
                        isDayBetween={isBetween}
                        onClick={() => handleDayClick(day)}
                    />
                );
            },
            [startDate, endDate, theme, handleDayClick],
        );

        const nextMonth = useMemo(() => currentMonth.add(1, 'month'), [currentMonth]);

        const handleShortcutClick = useCallback(
            (shortcut: Shortcut) => () => {
                const [start, end] = shortcut.getValue();
                onChange(start, end);
            },
            [onChange],
        );

        return (
            <Box sx={{ p: 2, display: 'inline-block' }}>
                <Stack direction="row" spacing={1.5} sx={{ gap: 0 }}>
                    <Stack spacing={1} sx={{ width: 130, pt: 8 }}>
                        {(shortcuts ?? []).map((shortcut) => (
                            <Button
                                key={shortcut.label}
                                variant="contained"
                                size="small"
                                onClick={handleShortcutClick(shortcut)}
                            >
                                {shortcut.label}
                            </Button>
                        ))}
                    </Stack>

                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
                        <Box>
                            <Box sx={{ mb: 1.5 }}>
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
                            <Stack direction="row" sx={{ gap: 0 }}>
                                <Box
                                    p={1}
                                    sx={{ borderRight: `1px solid ${theme.palette.divider}` }}
                                    display="flex"
                                    flexDirection="column"
                                >
                                    <Box
                                        display="flex"
                                        alignItems="baseline"
                                        justifyContent="space-between"
                                        sx={{ mb: 0.5 }}
                                    >
                                        <Box width="30px">
                                            <IconButton size="small" onClick={moveMonthHandler('left')}>
                                                <FontAwesomeIcon icon={faArrowLeft} />
                                            </IconButton>
                                        </Box>
                                        <Typography sx={{ fontSize: '0.9rem' }}>
                                            {currentMonth.locale('it').format('MMMM')}
                                        </Typography>
                                        <Box width="30px" />
                                    </Box>
                                    <DayCalendar
                                        currentMonth={currentMonth}
                                        disableFuture={false}
                                        disablePast={false}
                                        focusedDay={dateConstraints.focusedDay}
                                        hasFocus
                                        isMonthSwitchingAnimating={false}
                                        maxDate={dateConstraints.maxDate}
                                        minDate={dateConstraints.minDate}
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
                                        <Typography sx={{ fontSize: '0.9rem' }}>
                                            {nextMonth.locale('it').format('MMMM')}
                                        </Typography>
                                        <Box width="30px">
                                            <IconButton size="small" onClick={moveMonthHandler('right')}>
                                                <FontAwesomeIcon icon={faArrowRight} />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                    <DayCalendar
                                        currentMonth={nextMonth}
                                        disableFuture={false}
                                        disablePast={false}
                                        focusedDay={dateConstraints.focusedDay}
                                        hasFocus
                                        isMonthSwitchingAnimating={false}
                                        maxDate={dateConstraints.maxDate}
                                        minDate={dateConstraints.minDate}
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
    },
    (prevProps, nextProps) => {
        // Custom comparison for memo - only re-render if these change
        return (
            prevProps.startDate!.isSame(nextProps.startDate, 'day') &&
            prevProps.endDate!.isSame(nextProps.endDate, 'day') &&
            prevProps.shortcuts === nextProps.shortcuts
        );
    },
);

PickerContent.displayName = 'PickerContent';

export interface RangePickerProps extends FormControlOwnProps {
    date?: DateRange;
    onDateChange: (date: DateRange) => void;
}

const RangePickerField = memo((props: RangePickerProps) => {
    const { date, onDateChange, ...otherProps } = props;
    const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

    const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        setAnchorEl(event.currentTarget);
    }, []);

    const handleClose = useCallback(() => {
        setAnchorEl(null);
    }, []);

    const handleDateChange = useCallback(
        (start: Dayjs | null, end: Dayjs | null) => {
            onDateChange({ start: start ?? undefined, end: end ?? undefined });
            handleClose();
        },
        [onDateChange, handleClose],
    );

    const formattedRange = useMemo(
        () =>
            date?.start && date?.end
                ? `${date?.start.format('DD/MM/YYYY')} – ${date?.end ? date?.end.format('DD/MM/YYYY') : '...'}`
                : 'Select date range',
        [date?.start, date?.end],
    );

    return (
        <FormControl fullWidth {...otherProps}>
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
                    startDate={date?.start ?? null}
                    endDate={date?.end ?? null}
                    onChange={handleDateChange}
                />
            </Popover>
        </FormControl>
    );
});

RangePickerField.displayName = 'RangePickerField';

export default RangePickerField;
