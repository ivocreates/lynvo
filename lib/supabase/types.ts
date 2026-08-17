// Minimal placeholder types. Replace by running:
// npx supabase gen types typescript --project-id <ref> --schema public > lib/supabase/types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type LooseTable = {
  Row: Record<string, Json>;
  Insert: Record<string, Json | undefined>;
  Update: Record<string, Json | undefined>;
};

export interface Database {
  public: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Tables: { [table: string]: LooseTable };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: "super_admin" | "admin" | "editor";
    };
  };
}
