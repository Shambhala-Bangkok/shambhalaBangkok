import {
    addDays,
    addMonths,
    endOfMonth,
    getDate,
    getDay,
    getDaysInMonth,
    startOfMonth,
} from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'

import type { ParsedEvent } from '@/lib/event-parser'

const EVENT_TIMEZONE = 'Asia/Bangkok'

type Recurrence = NonNullable<ParsedEvent['recurrence']>

export type EventOccurrence = {
    title: string
    description: string
    location: string | null
    starts_at: string
    ends_at: string
}

type LocalDateTime = {
    date: string
    time: string
}

/**
 * Convert a Gemini-parsed event into one or more concrete
 * event occurrences.
 *
 * The returned timestamps are UTC ISO strings suitable for
 * Supabase timestamptz columns.
 */
export function expandEventOccurrences(
    event: ParsedEvent
): EventOccurrence[] {
    if (!event.recurrence) {
        return [
            createOccurrence(
                event,
                event.start,
                event.end
            ),
        ]
    }

    if (event.recurrence.type === 'none') {
        return [
            createOccurrence(
                event,
                event.start,
                event.end
            ),
        ]
    }

    switch (event.recurrence.type) {
        case 'weekly':
            return expandWeeklyEvent(event)

        case 'monthly':
            return expandMonthlyEvent(event)

        default:
            throw new Error(
                `Unsupported recurrence type: ${(event.recurrence as Recurrence).type
                }`
            )
    }
}

/**
 * Expand a weekly recurrence.
 *
 * Examples:
 *
 * Every Sunday for 4 weeks
 *   weekdays: [0]
 *   count: 4
 *
 * Every Saturday and Sunday until September 30
 *   weekdays: [0, 6]
 *   until: "2026-09-30"
 */
function expandWeeklyEvent(
    event: ParsedEvent
): EventOccurrence[] {
    const recurrence = event.recurrence

    if (!recurrence) {
        throw new Error(
            'Weekly recurrence is missing'
        )
    }

    const weekdays =
        recurrence.weekdays.length > 0
            ? [...new Set(recurrence.weekdays)].sort(
                (a, b) => a - b
            )
            : [getWeekday(event.start.date)]

    validateWeekdays(weekdays)

    const interval =
        recurrence.interval &&
            recurrence.interval > 0
            ? recurrence.interval
            : 1

    const startDate = parseLocalDate(
        event.start.date
    )

    const untilDate = recurrence.until
        ? parseLocalDate(recurrence.until)
        : null

    const occurrences: EventOccurrence[] = []

    let currentDate = startDate

    /*
     * We walk forward one day at a time.
     *
     * This is intentionally simple and deterministic.
     * Event series are normally small, so this is preferable
     * to introducing complicated recurrence libraries.
     */
    while (true) {
        if (
            untilDate &&
            currentDate > untilDate
        ) {
            break
        }

        const daysSinceStart = differenceInCalendarDays(
            startDate,
            currentDate
        )

        const weekNumber = Math.floor(
            daysSinceStart / 7
        )

        const isCorrectInterval =
            weekNumber % interval === 0

        const weekday = getDay(currentDate)

        if (
            isCorrectInterval &&
            weekdays.includes(weekday) &&
            currentDate >= startDate
        ) {
            const dateString =
                formatDateOnly(currentDate)

            const endDateString =
                determineEndDate(
                    event.start.date,
                    event.end.date,
                    dateString
                )

            occurrences.push(
                createOccurrence(
                    event,
                    {
                        date: dateString,
                        time: event.start.time,
                    },
                    {
                        date: endDateString,
                        time: event.end.time,
                    }
                )
            )

            if (
                recurrence.count !== null &&
                recurrence.count > 0 &&
                occurrences.length >= recurrence.count
            ) {
                break
            }
        }

        /*
         * Safety guard. We should never generate thousands
         * of events because of malformed LLM output.
         */
        if (occurrences.length >= 500) {
            throw new Error(
                'Recurrence produced more than 500 occurrences'
            )
        }

        /*
         * If there is no count or until, we need a finite
         * recurrence. Without one, we cannot safely create
         * an infinite number of database rows.
         */
        if (
            !untilDate &&
            !(
                recurrence.count !== null &&
                recurrence.count > 0
            )
        ) {
            throw new Error(
                'Recurring event must specify either count or until'
            )
        }

        currentDate = addDays(
            currentDate,
            1
        )
    }

    return occurrences
}

/**
 * Expand a monthly recurrence.
 *
 * Examples:
 *
 * Last Sunday of every month
 *   weekdays: [0]
 *   occurrences: ["last"]
 *
 * First and third Saturday of every month
 *   weekdays: [6]
 *   occurrences: ["first", "third"]
 */
function expandMonthlyEvent(
    event: ParsedEvent
): EventOccurrence[] {
    const recurrence = event.recurrence

    if (!recurrence) {
        throw new Error(
            'Monthly recurrence is missing'
        )
    }

    const weekdays =
        recurrence.weekdays.length > 0
            ? [...new Set(recurrence.weekdays)].sort(
                (a, b) => a - b
            )
            : [getWeekday(event.start.date)]

    validateWeekdays(weekdays)

    const positions: NonNullable<
        Recurrence['occurrences']
    > = recurrence.occurrences.length > 0
            ? [...new Set(recurrence.occurrences)]
            : ['first']

    const interval =
        recurrence.interval &&
            recurrence.interval > 0
            ? recurrence.interval
            : 1

    const startDate = parseLocalDate(
        event.start.date
    )

    const untilDate = recurrence.until
        ? parseLocalDate(recurrence.until)
        : null

    const occurrences: EventOccurrence[] = []

    let monthCursor = startOfMonth(
        startDate
    )

    while (true) {
        if (
            untilDate &&
            monthCursor > untilDate
        ) {
            break
        }

        const monthsSinceStart =
            differenceInCalendarMonths(
                startOfMonth(startDate),
                monthCursor
            )

        const isCorrectInterval =
            monthsSinceStart % interval === 0

        if (isCorrectInterval) {
            const monthOccurrences =
                getMonthlyDates(
                    monthCursor,
                    weekdays,
                    positions
                )

            for (const occurrenceDate of monthOccurrences) {
                if (occurrenceDate < startDate) {
                    continue
                }

                if (
                    untilDate &&
                    occurrenceDate > untilDate
                ) {
                    continue
                }

                const dateString =
                    formatDateOnly(occurrenceDate)

                const endDateString =
                    determineEndDate(
                        event.start.date,
                        event.end.date,
                        dateString
                    )

                occurrences.push(
                    createOccurrence(
                        event,
                        {
                            date: dateString,
                            time: event.start.time,
                        },
                        {
                            date: endDateString,
                            time: event.end.time,
                        }
                    )
                )

                if (
                    recurrence.count !== null &&
                    recurrence.count > 0 &&
                    occurrences.length >= recurrence.count
                ) {
                    return occurrences
                }

                if (occurrences.length >= 500) {
                    throw new Error(
                        'Recurrence produced more than 500 occurrences'
                    )
                }
            }
        }

        /*
         * As with weekly recurrence, don't allow an
         * infinite monthly series.
         */
        if (
            !untilDate &&
            !(
                recurrence.count !== null &&
                recurrence.count > 0
            )
        ) {
            throw new Error(
                'Recurring event must specify either count or until'
            )
        }

        monthCursor = addMonths(
            monthCursor,
            1
        )
    }

    return occurrences
}

/**
 * Find concrete dates for monthly positions.
 *
 * Example:
 *
 * February 2026
 * Saturday
 * ["first", "third"]
 *
 * → February 7
 * → February 21
 */
function getMonthlyDates(
    month: Date,
    weekdays: number[],
    positions: Recurrence['occurrences']
): Date[] {
    const results: Date[] = []

    for (const weekday of weekdays) {
        for (const position of positions) {
            const date = getNthWeekdayOfMonth(
                month,
                weekday,
                position
            )

            if (date) {
                results.push(date)
            }
        }
    }

    /*
     * Multiple weekday/position combinations can
     * theoretically produce duplicate dates.
     *
     * Sort chronologically and remove duplicates.
     */
    return deduplicateDates(
        results.sort(
            (a, b) =>
                a.getTime() - b.getTime()
        )
    )
}

/**
 * Find the first/second/third/fourth/last
 * occurrence of a weekday within a month.
 */
function getNthWeekdayOfMonth(
    month: Date,
    weekday: number,
    position:
        | 'first'
        | 'second'
        | 'third'
        | 'fourth'
        | 'last'
): Date | null {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(month)

    if (position === 'last') {
        let date = monthEnd

        while (getDay(date) !== weekday) {
            date = addDays(date, -1)
        }

        return date
    }

    const positionNumber =
        positionToNumber(position)

    if (!positionNumber) {
        return null
    }

    /*
     * Find first occurrence of the requested weekday.
     */
    const firstWeekdayOffset =
        (weekday - getDay(monthStart) + 7) % 7

    const dayOfMonth =
        1 +
        firstWeekdayOffset +
        (positionNumber - 1) * 7

    if (
        dayOfMonth >
        getDaysInMonth(monthStart)
    ) {
        return null
    }

    return new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        dayOfMonth
    )
}

function positionToNumber(
    position:
        | 'first'
        | 'second'
        | 'third'
        | 'fourth'
): number | null {
    switch (position) {
        case 'first':
            return 1

        case 'second':
            return 2

        case 'third':
            return 3

        case 'fourth':
            return 4

        default:
            return null
    }
}

/**
 * Convert a local Bangkok date/time into
 * a UTC ISO timestamp.
 *
 * Example:
 *
 * 2026-09-06 10:00
 * Asia/Bangkok
 *
 * becomes:
 *
 * 2026-09-06T03:00:00.000Z
 */
function localDateTimeToUtc(
    date: string,
    time: string
): string {
    const utcDate = fromZonedTime(
        `${date}T${time}:00`,
        EVENT_TIMEZONE
    )

    return utcDate.toISOString()
}

/**
 * Create the final database-ready occurrence.
 */
function createOccurrence(
    event: ParsedEvent,
    start: LocalDateTime,
    end: LocalDateTime
): EventOccurrence {
    return {
        title: event.title.trim(),

        description:
            event.description?.trim() ?? '',

        location:
            event.location?.trim() || null,

        starts_at: localDateTimeToUtc(
            start.date,
            start.time
        ),

        ends_at: localDateTimeToUtc(
            end.date,
            end.time
        ),
    }
}

/**
 * If an event crosses midnight, move the end date
 * forward by one day for every generated occurrence.
 *
 * Example:
 *
 * Start: 2026-09-06 23:00
 * End:   2026-09-07 01:00
 *
 * Recurrence occurrence:
 * Start: 2026-09-13 23:00
 * End:   2026-09-14 01:00
 */
function determineEndDate(
    originalStartDate: string,
    originalEndDate: string,
    occurrenceStartDate: string
): string {
    const originalStart =
        parseLocalDate(originalStartDate)

    const originalEnd =
        parseLocalDate(originalEndDate)

    const dayDifference =
        differenceInCalendarDays(
            originalStart,
            originalEnd
        )

    const occurrenceStart =
        parseLocalDate(occurrenceStartDate)

    return formatDateOnly(
        addDays(
            occurrenceStart,
            dayDifference
        )
    )
}

function parseLocalDate(
    value: string
): Date {
    const match =
        value.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        )

    if (!match) {
        throw new Error(
            `Invalid date: ${value}`
        )
    }

    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])

    const date = new Date(
        year,
        month - 1,
        day
    )

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        throw new Error(
            `Invalid calendar date: ${value}`
        )
    }

    return date
}

function formatDateOnly(
    date: Date
): string {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(
            2,
            '0'
        ),
        String(date.getDate()).padStart(
            2,
            '0'
        ),
    ].join('-')
}

function getWeekday(
    date: string
): number {
    return getDay(
        parseLocalDate(date)
    )
}

function validateWeekdays(
    weekdays: number[]
): void {
    for (const weekday of weekdays) {
        if (
            !Number.isInteger(weekday) ||
            weekday < 0 ||
            weekday > 6
        ) {
            throw new Error(
                `Invalid weekday: ${weekday}`
            )
        }
    }
}

function differenceInCalendarDays(
    start: Date,
    end: Date
): number {
    const startUtc = Date.UTC(
        start.getFullYear(),
        start.getMonth(),
        start.getDate()
    )

    const endUtc = Date.UTC(
        end.getFullYear(),
        end.getMonth(),
        end.getDate()
    )

    return Math.round(
        (endUtc - startUtc) /
        (1000 * 60 * 60 * 24)
    )
}

function differenceInCalendarMonths(
    start: Date,
    end: Date
): number {
    return (
        (end.getFullYear() -
            start.getFullYear()) *
        12 +
        (end.getMonth() -
            start.getMonth())
    )
}

function deduplicateDates(
    dates: Date[]
): Date[] {
    const seen = new Set<string>()
    const results: Date[] = []

    for (const date of dates) {
        const key = formatDateOnly(date)

        if (seen.has(key)) {
            continue
        }

        seen.add(key)
        results.push(date)
    }

    return results
}