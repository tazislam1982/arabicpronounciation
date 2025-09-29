// types/db.ts

/* ========= Primitives ========= */
export type UUID = string;          // PostgreSQL uuid → string in JS
export type ID = number;            // bigserial/bigint (safe for typical ids)
export type Timestamp = string;     // Neon returns timestamps as ISO strings

/* ========= Enums (from CHECK constraints) ========= */
export type UserRole = "admin" | "visitor";
export type EnrollmentStatus = "active" | "expired" | "pending";
export type VideoType = "youtube" | "vimeo" | "mp4" | "none";

/* ========= Reusable mixins ========= */
export type WithRowIds = { id: ID; uuid: UUID };
export type WithTimestamps = { created_at: Timestamp; updated_at: Timestamp };

/* ========= USERS ========= */
export type DbUser = WithRowIds & WithTimestamps & {
  name: string;
  /** citext in DB → still `string` in TS */
  email: string;
  /** bcrypt (or argon) hash, never plain text */
  password_hash: string;
  role: UserRole;
  remember_token: string | null;
};

/** Insert payload for users */
export type NewUserInsert = {
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  remember_token?: string | null;
};

/** Partial update payload (identify row by `id` or `uuid`) */
export type UserUpdate = Partial<Pick<DbUser, "name" | "email" | "password_hash" | "role" | "remember_token">>;

/* ========= CATEGORIES ========= */
export type DbCategory = WithRowIds & WithTimestamps & {
  slug: string;                 // case-insensitive unique by index (lower(slug))
  name: string;
  description: string | null;
  number_of_items: number;      // maintained by trigger
};

export type NewCategoryInsert = {
  slug: string;
  name: string;
  description?: string | null;
};

/* ========= ARABIC WORDS ========= */
export type DbArabicWord = WithRowIds & WithTimestamps & {
  category_id: ID;                  // FK → categories.id
  word: string;                     // Arabic text (render with Uthmani font client-side)
  meaning: string | null;
  description: string | null;
  explanation_video_url: string | null;
  video_type: VideoType;            // default 'none'
  audio_podcast: string | null;     // URL or path
};

export type NewArabicWordInsert = {
  category_id: ID;
  word: string;
  meaning?: string | null;
  description?: string | null;
  explanation_video_url?: string | null;
  video_type?: VideoType;           // if omitted, DB default applies
  audio_podcast?: string | null;
};

/* ========= ENROLLMENTS ========= */
export type DbEnrollment = WithRowIds & WithTimestamps & {
  user_id: ID;                      // FK → users.id
  starts_at: Timestamp | null;
  expires_at: Timestamp | null;
  status: EnrollmentStatus;         // default 'active'
  meta: unknown | null;             // JSONB
};

export type NewEnrollmentInsert = {
  user_id: ID;
  starts_at?: Timestamp | null;
  expires_at?: Timestamp | null;
  status?: EnrollmentStatus;
  meta?: unknown | null;
};

/* ========= VISITOR SCORES ========= */
export type DbVisitorScore = WithTimestamps & {
  id: ID;
  visitor_id: ID;                   // FK → users.id (role=visitor)
  word_uuid: UUID;                  // FK → arabic_words.uuid
  /** 0..100 (checked in DB) */
  score: number;
};

export type NewVisitorScoreInsert = {
  visitor_id: ID;
  word_uuid: UUID;
  score: number; // 0..100
};

/* ========= Common API helpers ========= */
export type PageMeta = {
  page: number;
  size: number;
  total: number;
};

/* ---------- Company Types ---------- */
export type Company = {
  id: number;
  uuid: string;
  name: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  contact_person_name: string | null;
  contact_person_email: string | null;
  contact_phone_country_code: string | null;
  contact_phone_number: string | null;
  contact_hours: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};


export type CategoryRow = {
  id: number;
  uuid: string;
  slug: string;
  name: string;
  description: string | null;
  number_of_items: number;
};

export type WordRow = {
  id: number;
  uuid: string;
  word: string;
  meaning: string | null;
  description: string | null;
  explanation_video_url: string | null;
  video_type: "youtube" | "vimeo" | "mp4" | "none";
  audio_url: string | null;
};

export type CategoryWithProgress = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  /** actual total words in this category (from arabic_words) */
  number_of_items: number;
  /** how many distinct words this user has attempted in this category */
  attempts: number;
  /** percent completion for this category (attempts / number_of_items * 100, rounded int) */
  completion_pct: number;
  /** optional: average score across attempted words (rounded int, may be 0 if none) */
  avg_score: number;
};