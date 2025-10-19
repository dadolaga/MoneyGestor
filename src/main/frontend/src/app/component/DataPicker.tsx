import React, { useState, useMemo, useCallback } from 'react';
import dayjs, { Dayjs } from 'dayjs';
// Dayjs plugins and Italian locale imports
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';
import isToday from 'dayjs/plugin/isToday';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import 'dayjs/locale/it';

// MUI imports
import { Box, Paper, Typography, IconButton, Grid, useTheme, List, ListItem, ListItemButton, ListItemText, ClickAwayListener } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

// Extend dayjs with plugins and set Italian locale (Display strings remain in Italian as requested previously)
dayjs.extend(weekday);
dayjs.extend(localeData);
dayjs.extend(isToday);
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(weekOfYear);
dayjs.locale('it');

// Type definition for the date range state
export interface DateRange {
    start: Dayjs | null;
    end: Dayjs | null;
}

interface IPropsDialog {
    dateRange: DateRange,
    setDateRange: React.Dispatch<React.SetStateAction<DateRange>>,
    show: boolean,
    hide: () => void
}

export function DataPickerDialog({ dateRange, setDateRange, show, hide }: IPropsDialog) {
    const theme = useTheme();
    const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());

    // Calculates the 42 days to display in the calendar grid (6 weeks)
    const calendarDays: Dayjs[] = useMemo(() => {
        const startOfMonth = currentMonth.startOf('month');
        // Start from the Sunday of the week containing the first day of the month
        const startOfGrid = startOfMonth.weekday(0); // 0 for Sunday
        const days: Dayjs[] = [];
        let day = startOfGrid;

        // Generate 6 weeks (42 days) to fully cover the month
        for (let i = 0; i < 42; i++) {
            days.push(day);
            day = day.add(1, 'day');
        }
        return days;
    }, [currentMonth]);

    // Short day names (Mon, Tue, ...) localized in Italian
    const dayNames: string[] = useMemo(() => {
        const localeData = dayjs.localeData();
        const days = localeData.weekdaysMin();
        // Reorder to start from Monday [Lun, Mar, ..., Dom]
        const orderedDays = [...days.slice(1), days[0]];
        return orderedDays.map(d => d.substring(0, 3));
    }, []);

    const getDayStyles = (day: Dayjs) => {
        const { start, end } = dateRange;

        const isCurrentMonth = day.month() === currentMonth.month();
        const isToday = day.isToday();

        const isStart = start && day.isSame(start, 'day');
        const isEnd = end && day.isSame(end, 'day');
        // Check if the day is strictly between start and end (exclusive of boundaries)
        const isInRange = start && end && day.isBetween(start, end, 'day', '()');

        // Base styles
        let sx: any = {
            p: 1,
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '36px',
            width: '36px',
            margin: '2px 0',
            borderRadius: isStart || isEnd ? '50%' : '2px', // Round extremes
            opacity: isCurrentMonth ? 1 : 0.4,
            color: 'text.primary',
            '&:hover': { backgroundColor: theme.palette.primary.light },
        };

        if (isStart || isEnd) {
            // Start/End Date Styles
            sx.backgroundColor = theme.palette.primary.main;
            sx.color = 'white';
            sx.borderRadius = '50%';
            sx['&:hover'].backgroundColor = theme.palette.primary.main;
        } else if (isInRange) {
            // Days inside the range (between extremes)
            sx.backgroundColor = theme.palette.secondary.dark;
            sx.color = theme.palette.text.primary;
            // Use square corners to visually connect the range
            sx.borderRadius = '0';
            sx.margin = '2px 0';
            sx['&:hover'].backgroundColor = '#a5b4fc';
        } else if (isToday && isCurrentMonth) {
            // Today (if not selected)
            sx.color = theme.palette.primary.main;
            sx.borderRadius = '50%';
        } else if (isCurrentMonth) {
            // Current Month Day (not selected)
            sx.color = 'text.primary';
        } else {
            // Days from other months
            sx.color = 'text.secondary';
        }

        return sx;
    };

    const previousMonthHandler = useCallback(() => {
        setCurrentMonth((prev) => prev.subtract(1, 'month'));
    }, []);

    const nextMonthHandler = useCallback(() => {
        setCurrentMonth((prev) => prev.add(1, 'month'));
    }, []);

    const dayClickHandler = useCallback((day: Dayjs) => {
        const { start, end } = dateRange;

        // 1. If no range is selected, set the start date
        if (!start && !end) {
            setDateRange({ start: day, end: null });
        }
        // 2. If only the start date is selected
        else if (start && !end) {
            if (day.isSame(start, 'day')) {
                setDateRange({ start: null, end: null });
            } else if (day.isSameOrBefore(start, 'day')) {
                setDateRange({ start: day, end: start });
            } else {
                setDateRange(prev => ({ ...prev, end: day }));
            }
        }
        else {
            setDateRange({ start: day, end: null });
        }

        setCurrentMonth(day);
    }, [dateRange, setDateRange]);

    const setCurrentWeekHandler = useCallback(() => {
        const currentWeekStart = dayjs().startOf('week');
        const currentWeekEnd = dayjs().endOf('week');

        setDateRange({ start: currentWeekStart, end: currentWeekEnd });
        setCurrentMonth(currentWeekStart);
    }, [setDateRange]);

    const setPreviousMonthHandler = useCallback(() => {
        const previousMonthStart = dayjs().subtract(1, 'month').startOf('month');
        const previousMonthEnd = dayjs().subtract(1, 'month').endOf('month');

        setDateRange({ start: previousMonthStart, end: previousMonthEnd });
        setCurrentMonth(previousMonthStart);
    }, [setDateRange]);

    const setCurrentMonthHandler = useCallback(() => {
        const currentMonthStart = dayjs().startOf('month');
        const currentMonthEnd = dayjs().endOf('month');

        setDateRange({ start: currentMonthStart, end: currentMonthEnd });
        setCurrentMonth(currentMonthStart);
    }, [setDateRange]);

    const setCurrentYearHandler = useCallback(() => {
        const currentYearStart = dayjs().startOf('year');
        const currentYearEnd = dayjs().endOf('year');

        setDateRange({ start: currentYearStart, end: currentYearEnd });
        setCurrentMonth(currentYearStart);
    }, [setDateRange]);

    return show && (
        <ClickAwayListener onClickAway={hide}>
            <Paper
                elevation={10}
                sx={{
                    position: 'absolute',
                    zIndex: 20,
                    left: 0,
                    mt: 1,
                    p: 2,
                    width: '500px',
                    borderRadius: '12px',
                    animation: 'fadeInDown 0.3s ease-out',
                }}
            >
                <Box display="flex" gap={2}>
                    <Box display="flex" flexDirection="column" gap={1} flexBasis={0} flexGrow={2} flexShrink={1}>
                        {/* Calendar Header (Month and Year) */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <IconButton onClick={previousMonthHandler} aria-label="Mese Precedente">
                                <FontAwesomeIcon icon={faChevronLeft} />
                            </IconButton>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.primary', textTransform: 'capitalize' }}>
                                {currentMonth.format('MMMM YYYY')}
                            </Typography>
                            <IconButton onClick={nextMonthHandler} aria-label="Mese Successivo">
                                <FontAwesomeIcon icon={faChevronRight} />
                            </IconButton>
                        </Box>

                        {/* Weekday Grid (Italian strings) */}
                        <Grid container spacing={0} sx={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: 'grey.600', textTransform: 'uppercase', mb: 1 }}>
                            {dayNames.map((day, index) => (
                                <Grid size={12 / 7} key={index}>
                                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{day}</Typography>
                                </Grid>
                            ))}
                        </Grid>

                        {/* Calendar Grid (Days) */}
                        <Grid container spacing={0}>
                            {calendarDays.map((day) => (
                                <Grid size={12 / 7} key={day.format('YYYY-MM-DD')} sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <Box
                                        onClick={() => dayClickHandler(day)}
                                        sx={{ ...getDayStyles(day), position: "relative" }}
                                        aria-label={`Seleziona ${day.format('D MMMM')}`} // Italian string
                                    >
                                        {day.date()}
                                        <Box position="absolute" width="100%" height="100%" sx={(dateRange.start && dateRange.end && (day.isSame(dateRange.start, 'day') || day.isSame(dateRange.end, 'day'))) ? {
                                            zIndex: -1,
                                            backgroundColor: theme.palette.secondary.dark,
                                            borderRadius: day.isSame(dateRange.start, 'day') ? "50% 0 0 50%" : "0 50% 50% 0"
                                        } : undefined} />
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                    <Box display="flex" flexBasis={0} flexGrow={1} flexShrink={1}>
                        <List>
                            <ListItem disablePadding>
                                <ListItemButton selected={dayjs().week() == dateRange.start?.week() &&
                                    dateRange.start?.week() == dateRange.end?.week() &&
                                    dateRange.start?.day() == 1 &&
                                    dateRange.end?.day() == 0}
                                    onClick={setCurrentWeekHandler}>
                                    <ListItemText primary="Questa settimana" />
                                </ListItemButton>
                            </ListItem>
                            <ListItem disablePadding>
                                <ListItemButton selected={dayjs().set("month", dayjs().month() - 1).month() == dateRange.start?.month() &&
                                    dateRange.start?.month() == dateRange.end?.month() &&
                                    dateRange.start?.get("date") == 1 &&
                                    dateRange.end?.endOf("month").get("date") == dateRange.end?.get("date")}
                                    onClick={setPreviousMonthHandler}>
                                    <ListItemText primary="Mese scorso" />
                                </ListItemButton>
                            </ListItem>
                            <ListItem disablePadding>
                                <ListItemButton selected={dayjs().month() == dateRange.start?.month() &&
                                    dateRange.start?.month() == dateRange.end?.month() &&
                                    dateRange.start?.get("date") == 1 &&
                                    dateRange.end?.endOf("month").get("date") == dateRange.end?.get("date")}
                                    onClick={setCurrentMonthHandler}>
                                    <ListItemText primary="Questo mese" />
                                </ListItemButton>
                            </ListItem>
                            <ListItem disablePadding>
                                <ListItemButton selected={dayjs().year() == dateRange.start?.year() &&
                                    dateRange.start?.year() == dateRange.end?.year() &&
                                    dateRange.start?.date() == 1 &&
                                    dateRange.start?.month() == 0 &&
                                    dateRange.end?.date() == 31 &&
                                    dateRange.end?.month() == 11}
                                    onClick={setCurrentYearHandler}>
                                    <ListItemText primary="Quest'anno" />
                                </ListItemButton>
                            </ListItem>
                        </List>
                    </Box>
                </Box>

            </Paper>
        </ClickAwayListener>
    );
}