import { NextResponse } from 'next/server'
import { fromZonedTime } from 'date-fns-tz'

import { requireAuth } from '@/lib/auth'

import {
    createEvent,
    createEventSeries,
    updateEventImage,
    updateEventSeries,
    getEventById,
    getEventsBySeriesId,
    updateEventOccurrence,
    updateEventSlug,
    createUniqueSlug,
    deleteEventsByIds,
} from '@/lib/events'

import {
    expandEventOccurrences,
    type EventOccurrence,
} from '@/lib/event-recurrence'

import type { ParsedEvent } from '@/lib/event-parser'
import { createAdminClient } from '@/lib/supabase/admin'

const EVENT_TIMEZONE = 'Asia/Bangkok'

type RecurrenceOccurrence =
    | 'first'
    | 'second'
    | 'third'
    | 'fourth'
    | 'last'

type RecurrenceInput = {
    type: 'none' | 'weekly' | 'monthly'
    interval?: number | null
    weekdays?: number[]
    occurrences?: RecurrenceOccurrence[]
    count?: number | null
    until?: string | null
}

type EventInput = {
    id?: string
    updateScope?: 'single' | 'series'

    title: string
    slug?: string
    summary?: string
    description?: string

    startDate: string
    endDate: string

    location?: string
    image?: string | null

    published?: boolean

    recurrence?: RecurrenceInput | null
}

function isRecurringInput(
    recurrence: RecurrenceInput | null | undefined
): recurrence is RecurrenceInput & {
    type: 'weekly' | 'monthly'
} {
    return Boolean(
        recurrence &&
        (recurrence.type === 'weekly' ||
            recurrence.type === 'monthly')
    )
}

function localDateTimeToUtc(
    value: string
): string {
    return fromZonedTime(
        value,
        EVENT_TIMEZONE
    ).toISOString()
}

function splitDateTime(
    value: string
) {
    const [date, timePart] =
        value.split('T')

    return {
        date,
        time: timePart?.slice(0, 5) ?? '',
    }
}

function buildParsedEvent(
    input: EventInput
): ParsedEvent {
    const start = splitDateTime(
        input.startDate
    )

    const end = splitDateTime(
        input.endDate
    )

    return {
        title: input.title.trim(),
        description:
            input.description?.trim() ?? '',
        location:
            input.location?.trim() || null,

        start: {
            date: start.date,
            time: start.time,
        },

        end: {
            date: end.date,
            time: end.time,
        },

        recurrence:
            input.recurrence &&
            input.recurrence.type !== 'none'
                ? {
                    type:
                        input.recurrence.type,
                    interval:
                        input.recurrence.interval ??
                        1,
                    weekdays:
                        input.recurrence.weekdays ??
                        [],
                    occurrences:
                        input.recurrence
                            .occurrences ?? [],
                    count:
                        input.recurrence.count ??
                        null,
                    until:
                        input.recurrence.until ??
                        null,
                }
                : null,
    } as ParsedEvent
}

/**
 * Build a parsed event using the original first
 * occurrence in the series as the date anchor.
 *
 * This prevents editing a middle occurrence from
 * accidentally moving the entire series' starting date.
 */
function buildAnchoredParsedEvent(
    input: EventInput,
    anchorEvent: {
        starts_at?: string
        ends_at?: string
    }
): ParsedEvent {
    if (
        !anchorEvent.starts_at ||
        !anchorEvent.ends_at
    ) {
        throw new Error(
            'Existing series contains an invalid event date'
        )
    }

    const startDateTime =
        new Intl.DateTimeFormat(
            'en-CA',
            {
                timeZone: EVENT_TIMEZONE,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            }
        ).format(
            new Date(
                anchorEvent.starts_at
            )
        )

    const endDateTime =
        new Intl.DateTimeFormat(
            'en-CA',
            {
                timeZone: EVENT_TIMEZONE,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            }
        ).format(
            new Date(
                anchorEvent.ends_at
            )
        )

    const [
        anchorStartDate,
        anchorStartTime,
    ] = startDateTime.split(', ')

    const [
        anchorEndDate,
        anchorEndTime,
    ] = endDateTime.split(', ')

    return {
        title: input.title.trim(),
        description:
            input.description?.trim() ?? '',
        location:
            input.location?.trim() || null,

        start: {
            date: anchorStartDate,
            time: anchorStartTime,
        },

        end: {
            date: anchorEndDate,
            time: anchorEndTime,
        },

        recurrence:
            input.recurrence &&
            input.recurrence.type !== 'none'
                ? {
                    type:
                        input.recurrence.type,
                    interval:
                        input.recurrence.interval ??
                        1,
                    weekdays:
                        input.recurrence.weekdays ??
                        [],
                    occurrences:
                        input.recurrence
                            .occurrences ?? [],
                    count:
                        input.recurrence.count ??
                        null,
                    until:
                        input.recurrence.until ??
                        null,
                }
                : null,
    } as ParsedEvent
}

function validateInput(
    input: EventInput
) {
    if (!input.title?.trim()) {
        throw new Error(
            'Event title is required'
        )
    }

    if (!input.startDate) {
        throw new Error(
            'Event start date is required'
        )
    }

    if (!input.endDate) {
        throw new Error(
            'Event end date is required'
        )
    }

    if (
        input.recurrence &&
        input.recurrence.type !== 'none' &&
        !isRecurringInput(input.recurrence)
    ) {
        throw new Error(
            'Invalid recurrence configuration'
        )
    }
}

async function updatePublished(
    eventId: string,
    published: boolean
) {
    const supabase =
        createAdminClient()

    const { data, error } =
        await supabase
            .from('events')
            .update({
                published,
            })
            .eq('id', eventId)
            .select()
            .single()

    if (error) {
        throw new Error(
            `Failed to update event publication: ${error.message}`
        )
    }

    return data
}

async function updateEvent(
    input: EventInput
) {
    if (!input.id) {
        throw new Error(
            'Event ID is required'
        )
    }

    const event = buildParsedEvent(
        input
    )

    const occurrences =
        expandEventOccurrences(
            event
        )

    if (occurrences.length === 0) {
        throw new Error(
            'No event occurrence could be generated'
        )
    }

    const occurrence =
        occurrences[0]

    const supabase =
        createAdminClient()

    const updateData: Record<
        string,
        string | boolean | null
    > = {
        title:
            occurrence.title,
        starts_at:
            occurrence.starts_at,
        ends_at:
            occurrence.ends_at,
        description:
            occurrence.description,
        location:
            occurrence.location,
    }

    if (
        input.published !== undefined
    ) {
        updateData.published =
            input.published
    }

    if (
        input.image !== undefined
    ) {
        updateData.image =
            input.image?.trim() || null
    }

    if (input.slug?.trim()) {
        updateData.slug =
            input.slug.trim()
    }

    const { data, error } =
        await supabase
            .from('events')
            .update(updateData)
            .eq('id', input.id)
            .select()
            .single()

    if (error) {
        throw new Error(
            `Failed to update event: ${error.message}`
        )
    }

    return data
}

export async function POST(
    request: Request
) {
    try {
        await requireAuth()

        const input =
            (await request.json()) as EventInput

        validateInput(input)

        const parsed =
            buildParsedEvent(input)

        const occurrences =
            expandEventOccurrences(
                parsed
            )

        if (
            occurrences.length === 0
        ) {
            throw new Error(
                'No event occurrences generated'
            )
        }

        let seriesId:
            string | null = null

        if (
            isRecurringInput(
                input.recurrence
            )
        ) {
            const series =
                await createEventSeries(
                    input.recurrence
                )

            seriesId = series.id
        }

        const createdEvents = []

        for (
            const occurrence
            of occurrences
        ) {
            const created =
                await createEvent(
                    occurrence,
                    {
                        seriesId,
                    }
                )

            if (input.published) {
                await updatePublished(
                    created.id,
                    true
                )
            }

            if (
                input.image?.trim()
            ) {
                await updateEventImage(
                    created.id,
                    input.image.trim()
                )
            }

            createdEvents.push(
                created
            )
        }

        return NextResponse.json({
            success: true,
            events: createdEvents,
            seriesId,
        })
    } catch (error) {
        console.error(
            'POST /api/admin/events failed:',
            error
        )

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Failed to create event',
            },
            {
                status: 400,
            }
        )
    }
}

export async function PATCH(
    request: Request
) {
    try {
        await requireAuth()

        const input =
            (await request.json()) as EventInput

        validateInput(input)

        if (!input.id) {
            throw new Error(
                'Event ID is required'
            )
        }

        /*
         * Normal single-event update.
         */
        if (
            input.updateScope !==
                'series' ||
            !isRecurringInput(
                input.recurrence
            )
        ) {
            const updated =
                await updateEvent(
                    input
                )

            return NextResponse.json({
                success: true,
                event: updated,
            })
        }

        /*
         * Entire-series update.
         */
        const existingEvent =
            await getEventById(
                input.id
            )

        if (
            !existingEvent.series_id
        ) {
            throw new Error(
                'This event does not belong to a series'
            )
        }

        const seriesId =
            existingEvent.series_id

        const existingEvents =
            await getEventsBySeriesId(
                seriesId
            )

        if (
            existingEvents.length === 0
        ) {
            throw new Error(
                'No events found in existing series'
            )
        }

        /*
         * Use the original first occurrence as
         * the anchor for the regenerated series.
         */
        const parsed =
            buildAnchoredParsedEvent(
                input,
                existingEvents[0]
            )

        const occurrences =
            expandEventOccurrences(
                parsed
            )

        if (
            occurrences.length === 0
        ) {
            throw new Error(
                'No event occurrences generated'
            )
        }

        /*
         * Update the series definition first.
         */
        await updateEventSeries(
            seriesId,
            input.recurrence
        )

        /*
         * Existing slugs can collide with the new
         * date-based slugs.
         *
         * Move every existing slug temporarily
         * out of the way first.
         */
        for (
            const existingEvent
            of existingEvents
        ) {
            await updateEventSlug(
                existingEvent.id,
                `updating-${existingEvent.id}`
            )
        }

        const updatedEvents = []

        /*
         * Reuse existing event rows where possible.
         *
         * Each reused occurrence gets a newly
         * generated slug based on its new date.
         */
        for (
            let i = 0;
            i < occurrences.length;
            i++
        ) {
            if (
                i < existingEvents.length
            ) {
                const slug =
                    await createUniqueSlug(
                        occurrences[i].title,
                        occurrences[i].starts_at
                    )

                const updated =
                    await updateEventOccurrence(
                        existingEvents[i].id,
                        occurrences[i],
                        {
                            published:
                                input.published ??
                                false,
                            image:
                                input.image,
                            slug,
                        }
                    )

                updatedEvents.push(
                    updated
                )
            } else {
                /*
                 * The new occurrence doesn't have
                 * an existing row, so createEvent()
                 * generates its unique slug normally.
                 */
                const created =
                    await createEvent(
                        occurrences[i],
                        {
                            seriesId,
                        }
                    )

                if (input.published) {
                    await updatePublished(
                        created.id,
                        true
                    )
                }

                if (
                    input.image?.trim()
                ) {
                    await updateEventImage(
                        created.id,
                        input.image.trim()
                    )
                }

                updatedEvents.push(
                    created
                )
            }
        }

        /*
         * If the new recurrence produces fewer
         * occurrences, remove the obsolete rows.
         */
        if (
            existingEvents.length >
            occurrences.length
        ) {
            const obsoleteIds =
                existingEvents
                    .slice(
                        occurrences.length
                    )
                    .map(
                        event =>
                            event.id
                    )

            await deleteEventsByIds(
                obsoleteIds
            )
        }

        return NextResponse.json({
            success: true,
            events: updatedEvents,
            count:
                updatedEvents.length,
            seriesId,
        })
    } catch (error) {
        console.error(
            'PATCH /api/admin/events failed:',
            error
        )

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Failed to update event',
            },
            {
                status: 400,
            }
        )
    }
}