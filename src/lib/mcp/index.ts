import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTeamsTool from "./tools/list-teams";
import listAthletesTool from "./tools/list-athletes";
import listMatchesTool from "./tools/list-matches";

// Costruisci l'issuer OAuth dal project ref (Vite lo inlinea a build time).
// Il fallback serve solo alla valutazione di manifest-extract dove nessun
// token viene mai verificato.
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "volleyscout-mcp",
  title: "VolleyScout Pro",
  version: "0.1.0",
  instructions:
    "Strumenti per VolleyScout Pro: leggi squadre, atlete e partite della società dell'utente autenticato. Tutti i tool rispettano le RLS della piattaforma.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTeamsTool, listAthletesTool, listMatchesTool],
});
