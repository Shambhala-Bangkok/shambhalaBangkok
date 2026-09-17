/* ========================================
   Bangkok Shambhala — Core Types
   ======================================== */

// --- Events ---

export type EventModality = 'in-person' | 'online' | 'hybrid';

export type EventStatus =
  | 'draft'
  | 'published'
  | 'cancelled'
  | 'completed'
  | 'recurring';

export type EventPricing = 'free' | 'donation' | 'fixed';

export interface SEvent {
  // Supabase fields
  id?: string;
  slug: string;
  title: string;
  summary: string;
  description: string;

  starts_at?: string;
  ends_at?: string;

  location: string;

  published?: boolean;

  series_id?: string | null;
  import_id?: string | null;

  // Frontend-compatible date fields
  startDate: string;
  endDate: string;

  // Legacy/optional fields still used elsewhere in the app
  timezone?: string;
  modality?: EventModality;
  registrationUrl?: string;
  videoCallUrl?: string;
  organizer?: string;
  facilitator?: string;
  pricing?: EventPricing;
  price?: number;
  suggestedDonation?: number;
  currency?: string;
  capacity?: number;
  tags?: string[];
  image?: string | null;
  status?: EventStatus;

  seo?: SEOMeta;
  autoPublish?: string[];

  createdAt?: string;
  updatedAt?: string;
}

// --- Blog / Posts ---

export type BlogSection =
  | 'shambhala-vision'
  | 'what-we-offer'
  | 'bibliography'
  | 'resources'
  | 'membership';

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string; // MDX/Markdown
  date: string;
  author?: string;
  tags: string[];
  image?: string;
  published: boolean;
  section?: BlogSection;
  seo?: SEOMeta;
}

// --- Pages ---

export interface Page {
  slug: string;
  title: string;
  content: string;
  seo?: SEOMeta;
  template?: string;
}

// --- Facilitator ---

export interface Facilitator {
  slug: string;
  name: string;
  bio: string;
  image?: string;
  role?: string;
}

// --- Donation ---

export interface DonationMethod {
  id: string;
  label: string;
  type: 'qr' | 'link' | 'bank';
  country?: string;
  qrImage?: string;
  url?: string;
  instructions?: string;
}

// --- Community Channel ---

export interface CommunityChannel {
  id: string;
  name: string;
  platform:
    | 'whatsapp'
    | 'line'
    | 'facebook'
    | 'instagram'
    | 'meetup'
    | 'eventbrite'
    | 'email'
    | 'couchsurfing'
    | 'other';
  url: string;
  icon?: string;
  primary?: boolean;
  disabled?: boolean;
  disabledLabel?: string;
}

// --- Location ---

export interface LocationInfo {
  name: string;
  address: string;
  addressLocal?: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  mapsUrl: string;
  directions?: string;
  transitInfo?: string;
}

// --- SEO ---

export interface SEOMeta {
  title?: string;
  description?: string;
  ogImage?: string;
  canonical?: string;
  noIndex?: boolean;
}

// --- Site Config ---

export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  url: string;
  locale: string;
  email: string;
  location: LocationInfo;
  social: CommunityChannel[];
  donationMethods: DonationMethod[];
  newsletter: {
    provider: string;
    formAction?: string;
  };
  analytics?: {
    plausibleDomain?: string;
    gaId?: string;
  };
}

// --- Navigation ---

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
  external?: boolean;
}

// --- Content Distribution ---

export interface ContentObject {
  type: 'event' | 'post' | 'page';
  slug: string;
  titleLong: string;
  titleShort: string;
  excerpt: string;
  newsletterCopy: string;
  socialCopyShort: string;
  socialCopyLong: string;
  canonicalUrl: string;
  ogImage: string;
  hashtags: string[];
  utmLinks: Record<string, string>;
  htmlSnippet: string;
}