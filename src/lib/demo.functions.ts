import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const DEMO = {
  miembro: { email: "demo.estudiante@ucb.edu.bo", name: "Estudiante Demo" },
  encargado: { email: "demo.encargado@ucb.edu.bo", name: "Encargado Demo" },
} as const;
const DEMO_PASSWORD = "UcbFoundDemo2026!";

// Creates (once) the demo account for the requested role and returns its credentials.
export const getDemoAccount = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ role: z.enum(["miembro", "encargado"]) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const demo = DEMO[data.role];

    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) throw new Error("No se pudo preparar la cuenta demo");
    let userId = list.users.find((u) => u.email === demo.email)?.id;

    if (!userId) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: demo.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: demo.name },
      });
      if (error || !created.user) throw new Error("No se pudo preparar la cuenta demo");
      userId = created.user.id;
    }

    if (data.role === "encargado") {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "encargado" }, { onConflict: "user_id,role" });
    }

    return { email: demo.email, password: DEMO_PASSWORD };
  });
