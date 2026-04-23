import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Stack, Button, Typography, IconButton, useTheme, Paper, styled, Theme, alpha } from '@mui/material';
import { LocalizationProvider, PickersDay, PickersDayProps } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DayCalendar } from '@mui/x-date-pickers/internals';
import dayjs, { Dayjs, utc } from 'dayjs';
import utcPlugin from 'dayjs/plugin/utc';
import timezonePlugin from 'dayjs/plugin/timezone';
import 'dayjs/locale/it';
import React from 'react';
import { useCallback, useMemo, useState } from 'react';

dayjs.extend(utcPlugin);
dayjs.extend(timezonePlugin);

const MemoizedCalendar = React.memo(DayCalendar);

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

export interface DateRange {
    start: Dayjs;
    end: Dayjs;
}

export interface DatePickerProps {
    date: DateRange;
    onDateChange: (date: DateRange) => void;
}

export default function DataPicker(props: DatePickerProps) {
    const theme = useTheme();

    const [visualizedMonth, setVisualizedMonth] = useState<Dayjs>(props.date?.start || dayjs());
    const [direction, setDirection] = useState<'left' | 'right'>('left');

    const selectedDays = useMemo(() => [props.date?.start, props.date?.end], [props.date?.start, props.date?.end]);

    const moveMonthHandler = useCallback(
        (direction: 'left' | 'right') => (event) => {
            setVisualizedMonth((date) => dayjs(date).add(direction === 'right' ? 1 : -1, 'month'));
            setDirection(direction === 'left' ? 'right' : 'left');
        },
        [],
    );

    const handleDayClick = useCallback(
        (date: Dayjs) => {
            if (props.date?.start === undefined && props.date?.end === undefined) {
                props.onDateChange({ start: date, end: undefined });
            } else if (props.date?.start !== undefined && props.date?.end === undefined) {
                if (date.isBefore(props.date?.start)) {
                    props.onDateChange({ start: date, end: undefined });
                } else {
                    props.onDateChange({ start: props.date?.start, end: date });
                }
            } else if (props.date?.start !== undefined && props.date?.end !== undefined) {
                if (date.isBefore(props.date?.start)) {
                    props.onDateChange({ start: date, end: props.date?.end });
                } else if (date.isAfter(props.date?.end)) {
                    props.onDateChange({ start: props.date?.start, end: date });
                } else {
                    const startDifference = Math.abs(date.diff(props.date?.start, 'day'));
                    const endDifference = Math.abs(date.diff(props.date?.end, 'day'));
                    if (startDifference < endDifference) {
                        props.onDateChange({ start: date, end: props.date?.end });
                    } else {
                        props.onDateChange({ start: props.date?.start, end: date });
                    }
                }
            }
        },
        [props.date],
    );

    const renderDay = (dayProps: PickersDayProps) => {
        const { day } = dayProps;

        const isStart = !!props.date?.start && day.isSame(props.date.start, 'day');
        const isEnd = !!props.date?.end && day.isSame(props.date.end, 'day');
        const isBetween =
            !!props.date?.start &&
            !!props.date.end &&
            day.isAfter(props.date.start, 'day') &&
            day.isBefore(props.date.end, 'day');

        return (
            <CustomDay
                {...dayProps} // Pass all original props through
                sx={{
                    width: '40px',
                    height: '36px',
                    margin: 0,
                }}
                theme={theme}
                isSelectedStart={isStart}
                isSelectedEnd={isEnd}
                isDayBetween={isBetween}
                onClick={() => handleDayClick(day)}
            />
        );
    };

    const onChange = (boh_1: any, boh_2: any) => {};

    const shortcuts: any[] = [];

    return (
        <Paper sx={{ p: 3, display: 'inline-block' }}>
            <Stack direction="row" spacing={3}>
                {shortcuts.length > 0 && (
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
                )}

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
                                <Typography>{props.date?.start?.format('MMM D')}</Typography>
                                <Typography fontSize={24}>-</Typography>
                                <Typography>{props.date?.end?.format('MMM D')}</Typography>
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
                                    <Typography>{visualizedMonth.format('MMMM')}</Typography>
                                    <Box width="30px" />
                                </Box>
                                <MemoizedCalendar
                                    currentMonth={visualizedMonth}
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
                                    selectedDays={selectedDays}
                                    slideDirection={direction}
                                    timezone={dayjs.tz.guess()}
                                    slots={{ day: renderDay }}
                                />
                            </Box>

                            <Box p={1} display="flex" flexDirection="column">
                                <Box display="flex" alignItems="baseline" justifyContent="space-between">
                                    <Box width="30px" />
                                    <Typography>{visualizedMonth.add(1, 'month').format('MMMM')}</Typography>
                                    <Box width="30px">
                                        <IconButton size="small" onClick={moveMonthHandler('right')}>
                                            <FontAwesomeIcon icon={faArrowRight} />
                                        </IconButton>
                                    </Box>
                                </Box>
                                <MemoizedCalendar
                                    currentMonth={visualizedMonth.add(1, 'month')}
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
                                    selectedDays={selectedDays}
                                    slideDirection={direction}
                                    timezone={dayjs.tz.guess()}
                                    slots={{ day: renderDay }}
                                />
                            </Box>
                        </Stack>
                    </Box>
                </LocalizationProvider>
            </Stack>
        </Paper>
    );
}
