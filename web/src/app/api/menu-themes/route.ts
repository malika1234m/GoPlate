import { getAuthUser, unauthorized } from "@/lib/auth";
import { MENU_THEMES, canUseTheme } from "@/lib/menu-themes";
import { canCustomiseAccent, planOf } from "@/lib/plans";

/**
 * The template catalogue, with this owner's entitlements already applied.
 *
 * Exists so the mobile app does not carry its own copy of the palettes. Mobile
 * and web are separate packages with no shared module, so a hardcoded list on
 * each side would drift the first time a template is added or a colour tweaked
 * — the same duplication that used to exist between MenuClient, the settings
 * picker and the API validator. Serving it means the phone shows exactly what
 * the server will accept, including which templates the plan has unlocked.
 */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const plan = planOf(user);

  return Response.json({
    plan,
    canCustomiseAccent: canCustomiseAccent(plan),
    themes: MENU_THEMES.map((t) => ({
      id: t.id,
      label: t.label,
      tone: t.tone,
      display: t.display,
      note: t.note,
      swatch: t.swatch,
      suggestedAccent: t.suggestedAccent,
      // Computed here rather than sent as a tier for the client to compare:
      // the phone should never have to know the plan ladder to render a lock.
      locked: !canUseTheme(plan, t.id),
      palette: {
        bg: t.palette["--m-bg"],
        surface: t.palette["--m-surface"],
        border: t.palette["--m-border"],
        text: t.palette["--m-text"],
        dim: t.palette["--m-dim"],
      },
    })),
  });
}
