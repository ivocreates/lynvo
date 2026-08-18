import { createClient } from "@/lib/supabase/server";

/**
 * Generic safe select: returns [] instead of throwing when Supabase
 * isn't configured yet, so the UI still renders during local setup.
 * Failures are logged because an empty page is otherwise indistinguishable
 * from a missing env var or a blocking RLS policy in production.
 */
async function safeSelect<T>(table: string, build: (q: any) => any): Promise<T[]> {
  try {
    const supabase = createClient();
    const query = build(supabase.from(table));
    const { data, error } = await query;
    if (error) {
      console.error(`[queries] select from "${table}" failed:`, error.code, error.message);
      return [];
    }
    return (data ?? []) as T[];
  } catch (error) {
    // Next.js signals a static-render bailout by throwing; it must propagate.
    if ((error as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE") throw error;
    console.error(`[queries] select from "${table}" threw:`, (error as Error).message);
    return [];
  }
}

export type Service = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  active: boolean;
  featured: boolean;
  content: Record<string, unknown> | null;
  tags: string[] | null;
  image_url: string | null;
};

export type Project = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: string;
  category: string | null;
  industry: string | null;
  content: Record<string, unknown> | null;
  tags: string[] | null;
  image_url: string | null;
  featured: boolean;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: string;
  published_at: string | null;
  content: string | null;
  tags: string[] | null;
  cover_image_url: string | null;
};

export type TeamMember = {
  id: string;
  display_name: string;
  role: string | null;
  is_active: boolean;
  bio: string | null;
  skills: string[] | null;
  social_links: Record<string, string> | null;
  image_url: string | null;
};

export type Review = {
  id: string;
  author_name: string;
  content: string;
  status: string;
  featured: boolean;
  author_role?: string | null;
  rating?: number | null;
};

export type Stat = {
  id: string;
  label: string;
  value: string;
  suffix: string | null;
  active: boolean;
};

export type SiteSetting = { key: string; value: { text?: string } | null };
export type SocialLink = { id: string; platform: string; url: string };

export type JobOpening = {
  id: string;
  slug: string;
  title: string;
  employment_type: string;
  department: string | null;
  location: string | null;
  excerpt: string | null;
  description: string | null;
  responsibilities: string[] | null;
  requirements: string[] | null;
  is_open: boolean;
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

export const getServices = () =>
  safeSelect<Service>("services", (q) => q.select("*").eq("active", true).order("order", { ascending: true }));

export const getProjects = () =>
  safeSelect<Project>("projects", (q) => q.select("*").eq("status", "published").order("created_at", { ascending: false }));

export const getBlogPosts = () =>
  safeSelect<BlogPost>("blog_posts", (q) => q.select("*").eq("status", "published").order("published_at", { ascending: false }));

export const getTeamMembers = () =>
  safeSelect<TeamMember>("team_members", (q) => q.select("*").eq("is_active", true).order("order", { ascending: true }));

export const getReviews = () =>
  safeSelect<Review>("reviews", (q) => q.select("*").eq("status", "approved"));

export const getStats = () =>
  safeSelect<Stat>("stats", (q) => q.select("*").eq("active", true).order("order", { ascending: true }));

export const getSiteSettings = () =>
  safeSelect<SiteSetting>("site_settings", (q) => q.select("key, value"));

export const getSocialLinks = () =>
  safeSelect<SocialLink>("social_links", (q) => q.select("id, platform, url").eq("active", true).order("order", { ascending: true }));

export const getJobOpenings = () =>
  safeSelect<JobOpening>("job_openings", (q) => q.select("*").eq("is_open", true).order("order", { ascending: true }));

export const getFaqs = (category = "contact") =>
  safeSelect<Faq>("faqs", (q) =>
    q.select("id, question, answer, category").eq("active", true).eq("category", category).order("order", { ascending: true })
  );

/** Flattens the site_settings key/value rows into a plain lookup object. */
export function settingsMap(rows: SiteSetting[]): Record<string, string> {
  return Object.fromEntries(rows.map((row) => [row.key, row.value?.text ?? ""]));
}
