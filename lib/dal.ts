// lib/dal.ts
import { sql } from "@/lib/db";
import { CategoryRow, CategoryWithProgress, Company, WordRow } from "@/types/db";

/** Resolve numeric users.id from users.uuid (JWT sub) */
export async function getUserIdByUuid(userUuid: string): Promise<number | null> {
  const rows = (await sql`
    select id from users where uuid = ${userUuid} limit 1
  `) as { id: number }[];
  return rows[0]?.id ?? null;
}


/** Categories + per-user progress */
// export async function listCategoriesWithProgressForUser(userId: number): Promise<CategoryWithProgress[]> {
//   const rows = (await sql`
//     select
//       c.id,
//       c.uuid,
//       c.slug,
//       c.name,
//       c.description,
//       coalesce(c.number_of_items, 0) as number_of_items,
//       coalesce(avg(vs.score), 0)::int as avg_score,
//       count(vs.score)::int as attempts
//     from categories c
//     left join arabic_words w
//       on w.category_id = c.id
//     left join visitor_scores vs
//       on vs.word_uuid = w.uuid
//      and vs.visitor_id = ${userId}
//     group by c.id
//     order by c.name asc
//   `) as CategoryWithProgress[];

//   return rows;
// }


export async function getActiveCompany(): Promise<Company | null> {
  const rows = (await sql`
    select id, uuid, name, address_line1, address_line2, city, state, postal_code, country,
           contact_person_name, contact_person_email,
           contact_phone_country_code, contact_phone_number, contact_hours,
           active, created_at, updated_at
    from companies
    where active = true
    order by id asc
    limit 1
  `) as Company[];
  return rows[0] ?? null;
}

/** Upsert-like convenience: if an active company exists, update it; otherwise insert one. */
export type UpsertCompanyInput = Partial<Omit<Company, "id" | "uuid" | "active" | "created_at" | "updated_at">> & {
  name: string;  // required on insert
  country: string; // required on insert
};

export async function upsertActiveCompany(payload: UpsertCompanyInput): Promise<Company> {
  const existing = await getActiveCompany();

  if (!existing) {
    const rows = (await sql`
      insert into companies
        (name, country, address_line1, address_line2, city, state, postal_code,
         contact_person_name, contact_person_email, contact_phone_country_code, contact_phone_number, contact_hours, active)
      values
        (${payload.name}, ${payload.country}, ${payload.address_line1 ?? null}, ${payload.address_line2 ?? null},
         ${payload.city ?? null}, ${payload.state ?? null}, ${payload.postal_code ?? null},
         ${payload.contact_person_name ?? null}, ${payload.contact_person_email ?? null},
         ${payload.contact_phone_country_code ?? null}, ${payload.contact_phone_number ?? null},
         ${payload.contact_hours ?? null}, true)
      returning id, uuid, name, address_line1, address_line2, city, state, postal_code, country,
                contact_person_name, contact_person_email,
                contact_phone_country_code, contact_phone_number, contact_hours,
                active, created_at, updated_at
    `) as Company[];
    return rows[0];
  }

  const rows = (await sql`
    update companies
       set name = coalesce(${payload.name}, name),
           country = coalesce(${payload.country}, country),
           address_line1 = ${payload.address_line1 ?? null},
           address_line2 = ${payload.address_line2 ?? null},
           city = ${payload.city ?? null},
           state = ${payload.state ?? null},
           postal_code = ${payload.postal_code ?? null},
           contact_person_name = ${payload.contact_person_name ?? null},
           contact_person_email = ${payload.contact_person_email ?? null},
           contact_phone_country_code = ${payload.contact_phone_country_code ?? null},
           contact_phone_number = ${payload.contact_phone_number ?? null},
           contact_hours = ${payload.contact_hours ?? null},
           updated_at = now()
     where id = ${existing.id}
     returning id, uuid, name, address_line1, address_line2, city, state, postal_code, country,
               contact_person_name, contact_person_email,
               contact_phone_country_code, contact_phone_number, contact_hours,
               active, created_at, updated_at
  `) as Company[];

  return rows[0];
}



export async function getCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  const rows = (await sql`
    select id, uuid, slug, name, description, coalesce(number_of_items,0) as number_of_items
    from categories
    where slug = ${slug}
    limit 1
  `) as CategoryRow[];
  return rows[0] ?? null;
}

export async function listWordsByCategoryId(categoryId: number): Promise<WordRow[]> {
  const rows = (await sql`
    select id, uuid, word, meaning, description, explanation_video_url, video_type, audio_url
    from arabic_words
    where category_id = ${categoryId}
    order by id asc
  `) as WordRow[];
  return rows;
}

/** best score per word for this user in this category, plus overall average of those best scores */
export async function bestScoresForUserInCategory(userId: number, categoryId: number) {
  const rows = (await sql`
    select vs.word_uuid, max(vs.score)::int as best
    from visitor_scores vs
    join arabic_words w on w.uuid = vs.word_uuid
    where vs.visitor_id = ${userId} and w.category_id = ${categoryId}
    group by vs.word_uuid
  `) as { word_uuid: string; best: number }[];

  const byWord: Record<string, number> = {};
  rows.forEach(r => { byWord[r.word_uuid] = r.best; });

  const overall =
    rows.length === 0 ? 0 : Math.round(rows.reduce((s, r) => s + r.best, 0) / rows.length);

  return { byWord, overall };
}

/** Insert a new attempt score (we keep history; no upsert) */
export async function insertVisitorScore(userId: number, wordUuid: string, score: number) {
  const rows = (await sql`
    insert into visitor_scores (visitor_id, word_uuid, score)
    values (${userId}, ${wordUuid}, ${score})
    returning id, visitor_id, word_uuid, score, created_at
  `) as { id: number; visitor_id: number; word_uuid: string; score: number; created_at: string }[];
  return rows[0];
}

export async function upsertVisitorScoreLatest(userId: number, wordUuid: string, score: number) {
  const rows = (await sql`
    insert into visitor_scores (visitor_id, word_uuid, score)
    values (${userId}, ${wordUuid}, ${score})
    on conflict (visitor_id, word_uuid)
    do update set score = excluded.score, updated_at = now()
    returning id, visitor_id, word_uuid, score, created_at, updated_at
  `) as { id:number; visitor_id:number; word_uuid:string; score:number; created_at:string; updated_at:string }[];
  return rows[0];
}

/** Latest scores (handles any legacy duplicates by most recent updated_at) + overall average */
export async function latestScoresForUserInCategory(userId: number, categoryId: number) {
  const rows = (await sql`
    select distinct on (vs.word_uuid)
           vs.word_uuid, vs.score
    from visitor_scores vs
    join arabic_words w on w.uuid = vs.word_uuid
    where vs.visitor_id = ${userId} and w.category_id = ${categoryId}
    order by vs.word_uuid, vs.updated_at desc
  `) as { word_uuid:string; score:number }[];

  const byWord: Record<string, number> = {};
  rows.forEach(r => { byWord[r.word_uuid] = r.score; });

  const overall = rows.length ? Math.round(rows.reduce((s,r)=>s+r.score,0) / rows.length) : 0;
  return { byWord, overall };
}






/**
 * Returns every category with:
 *  - number_of_items: COUNT(arabic_words) in that category
 *  - attempts: COUNT(DISTINCT visitor_scores.word_uuid) for this user in that category
 *  - completion_pct: attempts / number_of_items * 100 (int)
 *  - avg_score: AVG(visitor_scores.score) for this user in that category (rounded int)
 */
export async function listCategoriesWithProgressForUser(
  userId: number
): Promise<CategoryWithProgress[]> {
  // NOTE: do NOT use sql<...> generics here; Neon’s sql tag doesn’t accept type args.
  const rows = await sql /*sql*/ `
    WITH words_per_cat AS (
      SELECT w.category_id, COUNT(*)::int AS total_words
      FROM arabic_words w
      GROUP BY w.category_id
    ),
    attempts AS (
      SELECT
        w.category_id,
        COUNT(DISTINCT s.word_uuid)::int AS attempted_words,
        ROUND(AVG(s.score))::int         AS avg_score
      FROM visitor_scores s
      JOIN arabic_words w ON w.uuid = s.word_uuid
      WHERE s.visitor_id = ${userId}
      GROUP BY w.category_id
    )
    SELECT
      c.id,
      c.slug,
      c.name,
      c.description,
      COALESCE(wc.total_words, 0)    AS number_of_items,
      COALESCE(a.attempted_words, 0) AS attempts,
      CASE
        WHEN COALESCE(wc.total_words, 0) > 0
          THEN ROUND(100.0 * COALESCE(a.attempted_words, 0) / wc.total_words)::int
        ELSE 0
      END                             AS completion_pct,
      COALESCE(a.avg_score, 0)        AS avg_score
    FROM categories c
    LEFT JOIN words_per_cat wc ON wc.category_id = c.id
    LEFT JOIN attempts a       ON a.category_id = c.id
    ORDER BY c.id;
  `;

  // Cast the dynamic rows to the TypeScript shape
  return (rows as unknown as Array<{
    id: number;
    slug: string;
    name: string;
    description: string | null;
    number_of_items: number;
    attempts: number;
    completion_pct: number;
    avg_score: number;
  }>) as CategoryWithProgress[];
}

export async function getOverallCompletionForUser(userId: number): Promise<number> {
  const rows = await sql /*sql*/`
    SELECT
      (SELECT COUNT(*)::int FROM arabic_words)                 AS total_words,
      (SELECT COUNT(DISTINCT s.word_uuid)::int
         FROM visitor_scores s
        WHERE s.visitor_id = ${userId})                        AS attempted
  `;

  const r = (rows as any[])[0] ?? { total_words: 0, attempted: 0 };
  if (!r?.total_words) return 0;
  return Math.round((r.attempted * 100) / r.total_words);
}