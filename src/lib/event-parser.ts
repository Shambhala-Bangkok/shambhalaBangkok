import * as cheerio from 'cheerio'
import { GoogleGenAI, Type } from '@google/genai'

const EVENT_TIMEZONE = 'Asia/Bangkok'
const GEMINI_MODEL = 'gemini-3.6-flash'

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

export type ParsedEvent = {
  title: string
  description: string
  location: string | null

  start: {
    date: string
    time: string
  }

  end: {
    date: string
    time: string
  }

  recurrence: {
    type: 'none' | 'weekly' | 'monthly'
    interval: number | null
    weekdays: number[]
    occurrences: (
      | 'first'
      | 'second'
      | 'third'
      | 'fourth'
      | 'last'
    )[]
    count: number | null
    until: string | null
  } | null
}

type ParseEventEmailOptions = {
  html: string
  receivedAt?: string | null
}

export async function parseEventEmail({
  html,
  receivedAt,
}: ParseEventEmailOptions): Promise<ParsedEvent> {
  const cleanedHtml = cleanEmailHtml(html)

  if (!cleanedHtml.trim()) {
    throw new Error('Email contains no readable content')
  }

  const referenceDate = receivedAt
    ? new Date(receivedAt)
    : new Date()

  if (Number.isNaN(referenceDate.getTime())) {
    throw new Error('Invalid email received date')
  }

  const referenceDateString =
    referenceDate.toISOString()

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,

    contents: buildPrompt({
      emailHtml: cleanedHtml,
      receivedAt: referenceDateString,
    }),

    config: {
      responseMimeType: 'application/json',

      responseSchema: {
        type: Type.OBJECT,

        properties: {
          title: {
            type: Type.STRING,
            description:
              'The title or name of the event.',
          },

          description: {
            type: Type.STRING,
            description:
              'A concise, standalone HTML description suitable for an event webpage. Rewrite and organize the useful event information from the email rather than copying the email verbatim. Preserve important details and meaningful structure such as paragraphs, lists, headings, and useful links. Remove greetings, email-specific language, signatures, and unrelated content. Do not invent information.',
          },

          location: {
            type: Type.STRING,
            nullable: true,
            description:
              'The physical or online location of the event, if explicitly stated.',
          },

          start: {
            type: Type.OBJECT,
            properties: {
              date: {
                type: Type.STRING,
                description:
                  'Local calendar date in YYYY-MM-DD format.',
              },
              time: {
                type: Type.STRING,
                description:
                  'Local clock time in HH:mm 24-hour format.',
              },
            },
            required: ['date', 'time'],
          },

          end: {
            type: Type.OBJECT,
            properties: {
              date: {
                type: Type.STRING,
                description:
                  'Local calendar date in YYYY-MM-DD format.',
              },
              time: {
                type: Type.STRING,
                description:
                  'Local clock time in HH:mm 24-hour format.',
              },
            },
            required: ['date', 'time'],
          },

          recurrence: {
            type: Type.OBJECT,
            nullable: true,

            properties: {
              type: {
                type: Type.STRING,
                enum: [
                  'none',
                  'weekly',
                  'monthly',
                ],
              },

              interval: {
                type: Type.INTEGER,
                nullable: true,
                description:
                  'Repeat every N weeks or N months. Usually 1.',
              },

              weekdays: {
                type: Type.ARRAY,
                items: {
                  type: Type.INTEGER,
                },
                description:
                  'Weekday numbers using Sunday=0, Monday=1, ..., Saturday=6.',
              },

              occurrences: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                  enum: [
                    'first',
                    'second',
                    'third',
                    'fourth',
                    'last',
                  ],
                },
                description:
                  'For monthly recurrence, one or more positions within the month.',
              },

              count: {
                type: Type.INTEGER,
                nullable: true,
                description:
                  'Number of occurrences when explicitly stated.',
              },

              until: {
                type: Type.STRING,
                nullable: true,
                description:
                  'Last possible occurrence date in YYYY-MM-DD format when explicitly stated or clearly implied by the email.',
              },
            },

            required: [
              'type',
              'interval',
              'weekdays',
              'occurrences',
              'count',
              'until',
            ],
          },
        },

        required: [
          'title',
          'description',
          'location',
          'start',
          'end',
          'recurrence',
        ],
      },
    },
  })

  if (!response.text) {
    throw new Error(
      'Gemini returned an empty response'
    )
  }

  let parsed: ParsedEvent

  try {
    parsed = JSON.parse(response.text) as ParsedEvent
  } catch {
    throw new Error(
      'Gemini returned invalid JSON'
    )
  }

  validateParsedEvent(parsed)

  return parsed
}

function buildPrompt({
  emailHtml,
  receivedAt,
}: {
  emailHtml: string
  receivedAt: string
}): string {
  return `
You extract event information from incoming emails.

Your job is to identify the actual event information contained in the email and return it using the provided JSON schema.

IMPORTANT RULES:

1. Do not invent information.
2. Extract the event title from the email rather than the sender name or email subject.
3. Create a concise, standalone event description based on the useful event information in the email.
4. Rewrite and organize the information into natural prose suitable for an event webpage. Do NOT simply copy the email verbatim.
5. Remove email-specific language that is not useful on an event webpage, including:
   - greetings such as "Dear friends" or "Hello everyone"
   - announcements such as "We are happy to announce..."
   - calls to action that are redundant with the event page
   - email signatures and sign-offs
   - sender names
   - mailing-list language
   - unsubscribe information
   - forwarded-message headers
   - "please see below" or similar email-specific wording
6. Preserve all meaningful information about the event. Do not omit important details simply to make the description shorter.
7. Do not invent information or add claims that are not supported by the email.
8. The description MUST be returned as clean HTML.
9. Organize the description into logical paragraphs using <p> elements.
10. Use <h2> or <h3> headings when the source contains a meaningful section that benefits from a heading.
11. Convert meaningful bullet-point information into <ul><li>...</li></ul>.
12. Convert meaningful numbered information into <ol><li>...</li></ol>.
13. Preserve useful links using <a href="...">...</a> when they are relevant to the event.
14. Preserve meaningful bold or italic emphasis when it helps communicate the event information.
15. Combine fragmented sentences or email formatting into natural paragraphs where appropriate.
16. Do not preserve email layout merely for the sake of preserving it. The result should read naturally as a standalone event webpage.
17. Do not use repeated <br> elements to simulate paragraphs.
18. Do not include the email's outer <html>, <head>, or <body> tags.
19. Do not include scripts, styles, tracking elements, tracking pixels, or decorative email elements.
20. Do not repeat the event title, date, time, or location excessively if those details are already represented elsewhere on the event page.
21. Write in a neutral, informative tone appropriate for a community event listing.
22. The final description should contain the event's substance, not the email's communication wrapper.
23. All dates and times must represent the event's LOCAL time.
24. The event timezone is ${EVENT_TIMEZONE}.
25. Return dates as YYYY-MM-DD.
26. Return times as HH:mm using the 24-hour clock.
27. Never return UTC timestamps.
28. Do not calculate recurrence occurrences yourself.
29. If the email describes a recurring event, describe the recurrence using the recurrence object.
30. If the event does not recur, set recurrence to null.
31. If a recurrence rule is ambiguous, do not guess. Prefer the information explicitly stated in the email.
32. Relative dates such as "this Sunday", "next Sunday", "next month", etc. must be interpreted relative to the email received date.
33. The email received timestamp is provided below.
34. The event timezone is ${EVENT_TIMEZONE}, regardless of the server timezone.

WEEKDAY NUMBERS:

Sunday = 0
Monday = 1
Tuesday = 2
Wednesday = 3
Thursday = 4
Friday = 5
Saturday = 6

RECURRENCE EXAMPLES:

"Every Sunday in September"
→ type: "weekly"
→ weekdays: [0]
→ until: the last Sunday covered by the stated September period

"Every Sunday for four weeks"
→ type: "weekly"
→ weekdays: [0]
→ count: 4

"Every last Sunday of the month"
→ type: "monthly"
→ weekdays: [0]
→ occurrences: ["last"]

"First and third Saturday of every month"
→ type: "monthly"
→ weekdays: [6]
→ occurrences: ["first", "third"]

ONE-OFF EVENTS:

For a one-off event:
recurrence = null

EMAIL RECEIVED AT:
${receivedAt}

EMAIL HTML:
--------------------
${emailHtml}
--------------------
`
}

function cleanEmailHtml(html: string): string {
  const $ = cheerio.load(html)

  // Remove elements that are not useful for
  // event extraction or should never be returned.
  $(
    'script, style, noscript, svg, iframe, head, meta, link'
  ).remove()

  // Remove tracking pixels and decorative images.
  $('img').each((_, element) => {
    const src = $(element).attr('src') ?? ''
    const width = $(element).attr('width')
    const height = $(element).attr('height')

    const isTrackingPixel =
      width === '1' ||
      height === '1' ||
      src.includes('tracking') ||
      src.includes('pixel')

    if (isTrackingPixel) {
      $(element).remove()
    }
  })

  // Remove common email-only elements.
  $(
    '[role="presentation"], [role="navigation"]'
  ).remove()

  const body = $('body')

  if (!body.length) {
    return $.html()
  }

  // Remove excessive whitespace from text nodes while
  // keeping the HTML structure intact.
  body.find('*').each((_, element) => {
    $(element)
      .contents()
      .filter(function () {
        return this.type === 'text'
      })
      .each((_, textNode) => {
        if (textNode.type === 'text') {
          textNode.data = textNode.data
            ?.replace(/\u00a0/g, ' ')
            .replace(/[ \t]+/g, ' ')
            .trim() ?? ''
        }
      })
  })

  // Remove empty elements created by cleanup.
  body.find('p, div, span').each((_, element) => {
    const $element = $(element)

    if (
      !$element.text().trim() &&
      !$element.find('img, a').length
    ) {
      $element.remove()
    }
  })

  return body.html()?.trim() ?? ''
}

function validateParsedEvent(
  event: ParsedEvent
): void {
  if (!event.title?.trim()) {
    throw new Error(
      'Gemini did not extract an event title'
    )
  }

  if (!event.start?.date || !event.start?.time) {
    throw new Error(
      'Gemini did not extract an event start date/time'
    )
  }

  if (!event.end?.date || !event.end?.time) {
    throw new Error(
      'Gemini did not extract an event end date/time'
    )
  }

  if (!isValidDateString(event.start.date)) {
    throw new Error(
      `Invalid event start date: ${event.start.date}`
    )
  }

  if (!isValidDateString(event.end.date)) {
    throw new Error(
      `Invalid event end date: ${event.end.date}`
    )
  }

  if (!isValidTimeString(event.start.time)) {
    throw new Error(
      `Invalid event start time: ${event.start.time}`
    )
  }

  if (!isValidTimeString(event.end.time)) {
    throw new Error(
      `Invalid event end time: ${event.end.time}`
    )
  }

  if (
    event.recurrence &&
    event.recurrence.type === 'none'
  ) {
    event.recurrence = null
  }

  if (event.recurrence) {
    event.recurrence.occurrences =
      event.recurrence.occurrences ?? []
  }
}

function isValidDateString(
  value: string
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00Z`)

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().startsWith(value)
  )
}

function isValidTimeString(
  value: string
): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return false
  }

  const [hour, minute] = value
    .split(':')
    .map(Number)

  return (
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  )
}