'use client';

import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';
import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';

import { DateField } from '@/components/shared/date-field';
import { InputField } from '@/components/shared/form-controls';
import { Select } from '@/components/ui/select';

import { isCalendarDate, monthlyTimingForDate, recurrencePreview } from './transaction-editor-model';
import type { TransactionFormValues } from './transaction-editor-model';

export function TransactionRecurrenceFields({ form, id }: { form: UseFormReturn<TransactionFormValues>; id: string }) {
    const t = useTranslations('Movements.editor.recurrence');
    const tDialog = useTranslations('Movements.dialog');
    const format = useFormatter();
    const { control, getValues, setValue } = form;
    useWatch({
        control,
        name: ['date', 'frequency', 'interval', 'weekdays', 'monthlyTiming', 'endType', 'endDate', 'count'],
    });
    const values = getValues();
    const anchor = isCalendarDate(values.date) ? dayjs(values.date) : undefined;
    const dates = recurrencePreview(values);
    const timing = anchor === undefined ? 'day' : monthlyTimingForDate(values.monthlyTiming, anchor);
    const weekdays = [1, 2, 3, 4, 5, 6, 0];
    const dateLabel = (value: Date) => format.dateTime(value, { day: 'numeric', month: 'long', year: 'numeric' });
    const weekday = (day: number, short = false) =>
        format.dateTime(dayjs('2024-01-07').add(day, 'day').toDate(), { weekday: short ? 'short' : 'long' });
    const initialDateLabel =
        anchor === undefined ? t('chooseDate') : t('firstDate', { date: dateLabel(anchor.toDate()) });
    const monthlyOptions =
        anchor === undefined
            ? []
            : [
                  { value: 'day', label: t('onDay', { day: anchor.date() }) },
                  { value: 'lastDay', label: t('lastDay'), disabled: anchor.date() !== anchor.daysInMonth() },
                  {
                      value: 'weekday',
                      label: t('onWeekday', {
                          ordinal: t(`ordinals.${Math.ceil(anchor.date() / 7)}`),
                          weekday: weekday(anchor.day()),
                      }),
                  },
                  {
                      value: 'lastWeekday',
                      label: t('lastWeekday', { weekday: weekday(anchor.day()) }),
                      disabled: anchor.add(7, 'day').month() === anchor.month(),
                  },
              ];
    const dayOptions = Array.from({ length: anchor?.daysInMonth() ?? 31 }, (_, index) => index + 1);

    function changeDayHandler(value: string) {
        if (anchor === undefined) return;
        setValue('date', anchor.date(Number(value)).format('YYYY-MM-DD'), { shouldDirty: true, shouldValidate: true });
    }

    function changeMonthHandler(value: string) {
        if (anchor === undefined) return;
        setValue('date', anchor.month(Number(value)).format('YYYY-MM-DD'), { shouldDirty: true, shouldValidate: true });
    }

    return (
        <section
            className="grid gap-4 rounded-lg border border-solid border-border bg-muted/15 p-4"
            aria-label={t('title')}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                    control={control}
                    name="frequency"
                    id={`${id}-frequency`}
                    kind="select"
                    label={t('frequency')}
                    options={['daily', 'weekly', 'monthly', 'yearly'].map((value) => ({
                        value,
                        label: t(`frequencies.${value}`),
                    }))}
                />
                <InputField
                    control={control}
                    name="interval"
                    id={`${id}-interval`}
                    type="number"
                    min={1}
                    max={99}
                    step={1}
                    label={t('every')}
                    endAdornment={t(`units.${values.frequency}`)}
                    rules={{
                        required: tDialog('required'),
                        validate: (value) =>
                            (typeof value === 'string' && /^[1-9]\d?$/.test(value)) || t('invalidInterval'),
                    }}
                />
            </div>
            <p className="m-0 text-xs text-muted-foreground">{initialDateLabel}</p>

            {values.frequency === 'weekly' && (
                <fieldset className="m-0 min-w-0 border-0 p-0">
                    <legend className="mb-2 text-sm font-medium">{t('weekdays')}</legend>
                    <div className="flex flex-wrap gap-2">
                        {weekdays.map((day) => {
                            const isAnchor = anchor?.day() === day;
                            const checked = isAnchor || values.weekdays.includes(day);
                            return (
                                <label key={day} className="relative cursor-pointer" title={weekday(day)}>
                                    <input
                                        className="peer sr-only"
                                        type="checkbox"
                                        checked={checked}
                                        aria-readonly={isAnchor}
                                        aria-label={weekday(day)}
                                        onChange={() => {
                                            if (isAnchor) return;
                                            setValue(
                                                'weekdays',
                                                checked
                                                    ? values.weekdays.filter((value) => value !== day)
                                                    : [...values.weekdays, day],
                                                { shouldDirty: true },
                                            );
                                        }}
                                    />
                                    <span className="flex min-h-10 min-w-10 items-center justify-center rounded-md border border-solid border-input bg-background px-2 text-xs peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                                        {weekday(day, true)}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                    <p className="m-0 mt-2 text-xs text-muted-foreground">{t('weekdayHint')}</p>
                </fieldset>
            )}

            {values.frequency === 'monthly' && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium" htmlFor={`${id}-month-day`}>
                            {t('dayOfMonth')}
                        </label>
                        <Select
                            id={`${id}-month-day`}
                            value={anchor?.date() ?? ''}
                            disabled={anchor === undefined}
                            onValueChange={changeDayHandler}
                        >
                            {dayOptions.map((day) => (
                                <option key={day} value={day}>
                                    {day}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium" htmlFor={`${id}-month-timing`}>
                            {t('timing')}
                        </label>
                        <Select
                            id={`${id}-month-timing`}
                            value={timing}
                            disabled={anchor === undefined}
                            onChange={(event) => {
                                const value = event.target.value;
                                if (
                                    value === 'day' ||
                                    value === 'lastDay' ||
                                    value === 'weekday' ||
                                    value === 'lastWeekday'
                                )
                                    setValue('monthlyTiming', value, { shouldDirty: true });
                            }}
                        >
                            {monthlyOptions.map((option) => (
                                <option key={option.value} value={option.value} disabled={option.disabled}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <p className="m-0 text-xs text-muted-foreground sm:col-span-2">{t('monthHint')}</p>
                </div>
            )}

            {values.frequency === 'yearly' && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium" htmlFor={`${id}-year-month`}>
                            {t('month')}
                        </label>
                        <Select
                            id={`${id}-year-month`}
                            value={anchor?.month() ?? ''}
                            disabled={anchor === undefined}
                            onValueChange={changeMonthHandler}
                        >
                            {Array.from({ length: 12 }, (_, month) => (
                                <option key={month} value={month}>
                                    {format.dateTime(dayjs('2024-01-01').month(month).toDate(), { month: 'long' })}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium" htmlFor={`${id}-year-day`}>
                            {t('day')}
                        </label>
                        <Select
                            id={`${id}-year-day`}
                            value={anchor?.date() ?? ''}
                            disabled={anchor === undefined}
                            onValueChange={changeDayHandler}
                        >
                            {dayOptions.map((day) => (
                                <option key={day} value={day}>
                                    {day}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <p className="m-0 text-xs text-muted-foreground sm:col-span-2">{t('yearHint')}</p>
                </div>
            )}

            <div className="grid items-start gap-4 sm:grid-cols-2">
                <InputField
                    control={control}
                    name="endType"
                    id={`${id}-end-type`}
                    kind="select"
                    label={t('ends')}
                    options={['never', 'date', 'count'].map((value) => ({ value, label: t(`endOptions.${value}`) }))}
                />
                {values.endType === 'date' && (
                    <DateField
                        control={control}
                        name="endDate"
                        id={`${id}-end-date`}
                        label={t('endDate')}
                        placeholder={tDialog('datePlaceholder')}
                        todayLabel={tDialog('today')}
                        previousMonthLabel={tDialog('previousMonth')}
                        nextMonthLabel={tDialog('nextMonth')}
                        formatDate={dateLabel}
                        formatMonth={(date) => format.dateTime(date, { month: 'long', year: 'numeric' })}
                        formatWeekday={(date) => format.dateTime(date, { weekday: 'short' })}
                        rules={{
                            required: tDialog('required'),
                            validate: (value) =>
                                (typeof value === 'string' && isCalendarDate(value) && value >= getValues('date')) ||
                                t('invalidEndDate'),
                        }}
                    />
                )}
                {values.endType === 'count' && (
                    <InputField
                        control={control}
                        name="count"
                        id={`${id}-count`}
                        type="number"
                        min={2}
                        max={999}
                        step={1}
                        label={t('count')}
                        description={t('countHint')}
                        rules={{
                            required: tDialog('required'),
                            validate: (value) =>
                                (typeof value === 'string' && /^[1-9]\d{0,2}$/.test(value) && Number(value) >= 2) ||
                                t('invalidCount'),
                        }}
                    />
                )}
            </div>
            <div aria-live="polite" className="border-t border-border pt-3">
                <p className="m-0 text-xs font-medium">{t('preview')}</p>
                <ol className="m-0 mt-2 flex list-none flex-wrap gap-2 p-0">
                    {dates.map((date) => (
                        <li key={date} className="rounded-md bg-background px-2 py-1 text-xs text-muted-foreground">
                            {dateLabel(dayjs(date).toDate())}
                        </li>
                    ))}
                </ol>
            </div>
            <p className="m-0 text-xs text-muted-foreground">{t('previewOnly')}</p>
        </section>
    );
}
