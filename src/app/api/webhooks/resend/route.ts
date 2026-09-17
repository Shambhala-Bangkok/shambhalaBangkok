import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

import { parseEventEmail } from '@/lib/event-parser'
import { expandEventOccurrences } from '@/lib/event-recurrence'
import {
  createEvent,
  createEventImport,
  createEventSeries,
  getEventImportByEmailId,
  getEventsByImportId,
  publishEventsByImportId,
  updateEventImage,
  updateEventImportSeries,
} from '@/lib/events'
import { uploadEventImage } from '@/lib/event-image'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    /*
     * Read the raw body first.
     *
     * Resend webhook signature verification requires the
     * original, unmodified request body.
     */
    const payload = await request.text()

    const event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get('svix-id') ?? '',
        timestamp:
          request.headers.get('svix-timestamp') ?? '',
        signature:
          request.headers.get('svix-signature') ?? '',
      },
      webhookSecret:
        process.env.RESEND_WEBHOOK_SECRET!,
    })

    /*
     * We only care about inbound emails.
     */
    if (event.type !== 'email.received') {
      return NextResponse.json({
        received: true,
      })
    }

    const emailId = event.data?.email_id

    if (!emailId) {
      return NextResponse.json(
        { error: 'Missing email_id' },
        { status: 400 }
      )
    }

    console.log(
      `Processing Resend email: ${emailId}`
    )

    /*
     * -------------------------------------------------------
     * 1. Idempotency check
     * -------------------------------------------------------
     *
     * If this email has already been imported, don't run
     * Gemini again and don't create duplicate events.
     */
    const existingImport =
      await getEventImportByEmailId(emailId)

    if (existingImport) {
      const existingEvents =
        await getEventsByImportId(existingImport.id)

      if (existingEvents.length > 0) {
        console.log(
          `Email ${emailId} already imported. Returning existing events.`
        )

        return NextResponse.json({
          success: true,
          alreadyProcessed: true,
          importId: existingImport.id,
          eventIds: existingEvents.map(
            (event) => event.id
          ),
        })
      }

      /*
       * If an import exists but has no events, it means a
       * previous attempt failed partway through. Continue
       * processing so it can recover.
       */
      console.log(
        `Existing import ${existingImport.id} has no events. Retrying.`
      )
    }

    /*
     * -------------------------------------------------------
     * 2. Retrieve the complete inbound email
     * -------------------------------------------------------
     */
    const { data: email, error: emailError } =
      await resend.emails.receiving.get(emailId)

    if (emailError || !email) {
      console.error(
        'Failed to retrieve email:',
        emailError
      )

      return NextResponse.json(
        { error: 'Failed to retrieve email' },
        { status: 500 }
      )
    }

    if (!email.html) {
      return NextResponse.json(
        { error: 'Email has no HTML content' },
        { status: 422 }
      )
    }

    /*
     * -------------------------------------------------------
     * 3. Parse the email with Gemini
     * -------------------------------------------------------
     *
     * We pass the received timestamp so the parser can
     * resolve relative language such as:
     *
     *   "this Sunday"
     *   "next month"
     *   "every Sunday in September"
     */
    const parsedEvent = await parseEventEmail({
      html: email.html,
      receivedAt: email.created_at,
    })

    console.log(
      'Parsed event:',
      JSON.stringify(parsedEvent, null, 2)
    )

    /*
     * -------------------------------------------------------
     * 4. Expand recurrence into individual occurrences
     * -------------------------------------------------------
     *
     * Example:
     *
     *   Every Sunday in September
     *
     * becomes:
     *
     *   Sep 6
     *   Sep 13
     *   Sep 20
     *   Sep 27
     *
     * Each occurrence becomes its own event row/page.
     */
    const occurrences =
      expandEventOccurrences(parsedEvent)

    if (occurrences.length === 0) {
      throw new Error(
        'Event parser produced no occurrences'
      )
    }

    console.log(
      `Expanded event into ${occurrences.length} occurrence(s)`
    )

    /*
     * -------------------------------------------------------
     * 5. Create series/import identifiers
     * -------------------------------------------------------
     *
     * A recurring event gets one shared series_id.
     * A one-off event has no series_id.
     */
    let seriesId: string | null = null

    if (
      parsedEvent.recurrence &&
      parsedEvent.recurrence.type !== 'none'
    ) {
      const series = await createEventSeries({
        type: parsedEvent.recurrence.type,
        interval: parsedEvent.recurrence.interval,
        weekdays: parsedEvent.recurrence.weekdays,
        occurrences: parsedEvent.recurrence.occurrences,
        count: parsedEvent.recurrence.count,
        until: parsedEvent.recurrence.until,
      })

      seriesId = series.id
    }
    let importRecord =
      existingImport ??
      (await createEventImport(
        emailId,
        seriesId
      ))

    /*
     * If an import already existed without a series ID,
     * update it now.
     */
    if (
      seriesId &&
      importRecord.series_id !== seriesId
    ) {
      importRecord =
        await updateEventImportSeries(
          importRecord.id,
          seriesId
        )
    }

    /*
     * -------------------------------------------------------
     * 6. Create one database event per occurrence
     * -------------------------------------------------------
     */
    const createdEvents = []

    for (const occurrence of occurrences) {
      const createdEvent = await createEvent(
        occurrence,
        {
          importId: importRecord.id,
          seriesId,
        }
      )

      createdEvents.push(createdEvent)

      console.log(
        `Created event ${createdEvent.id}: ${createdEvent.title}`
      )
    }

    /*
     * -------------------------------------------------------
     * 7. Upload the email's image once
     * -------------------------------------------------------
     *
     * The image is stored against the email/import rather
     * than an individual occurrence.
     */
    const imagePath =
      await uploadEventImage(emailId)

    if (imagePath) {
      console.log(
        `Uploaded event image: ${imagePath}`
      )

      /*
       * Attach the same image to every occurrence.
       */
      for (const event of createdEvents) {
        await updateEventImage(
          event.id,
          imagePath
        )
      }

      /*
       * -----------------------------------------------------
       * 8. Publish only after image upload succeeds
       * -----------------------------------------------------
       */
      await publishEventsByImportId(
        importRecord.id
      )

      console.log(
        `Published ${createdEvents.length} event(s)`
      )
    } else {
      /*
       * No image means the events remain unpublished.
       * This follows the current requirement that an event
       * is published after its image has been uploaded.
       */
      console.log(
        `No image found for email ${emailId}. Events remain unpublished.`
      )
    }

    return NextResponse.json({
      success: true,
      alreadyProcessed: false,
      importId: importRecord.id,
      seriesId,
      eventIds: createdEvents.map(
        (event) => event.id
      ),
      eventCount: createdEvents.length,
      image: imagePath,
      published: Boolean(imagePath),
    })
  } catch (error) {
    console.error(
      'Resend webhook error:',
      error
    )

    return new NextResponse(
      'Invalid webhook or processing error',
      { status: 400 }
    )
  }
}