import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_athletes",
  title: "Elenca atlete",
  description:
    "Elenca le atlete accessibili all'utente. Filtro opzionale per team_id.",
  inputSchema: {
    team_id: z
      .string()
      .uuid()
      .optional()
      .describe("UUID della squadra per filtrare le atlete."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ team_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non autenticato." }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("athletes")
      .select("id, first_name, last_name, role, number, team_id, society_id")
      .order("last_name", { ascending: true });
    if (team_id) q = q.eq("team_id", team_id);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { athletes: data ?? [] },
    };
  },
});
