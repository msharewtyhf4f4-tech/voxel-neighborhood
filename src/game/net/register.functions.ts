import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkName, nameToEmail, PASSWORD_MIN } from "./identity";

export type RegisterResult = { status: "created" | "taken" | "invalid_name" | "weak" | "error" };

/** Creates a player account from a name + password (no email needed). */
export const registerPlayer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ name: z.string().max(60), password: z.string().min(PASSWORD_MIN).max(72) }).parse(input),
  )
  .handler(async ({ data }): Promise<RegisterResult> => {
    const name = checkName(data.name);
    if (!name.ok) return { status: "invalid_name" };
    const email = await nameToEmail(name.key);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: name.display, username: name.key },
    });
    if (!error) return { status: "created" };
    const code = (error as { code?: string }).code ?? "";
    if (code === "email_exists" || code === "user_already_exists" || /already/i.test(error.message)) {
      return { status: "taken" };
    }
    if (code === "weak_password" || /password/i.test(error.message)) return { status: "weak" };
    console.error("registerPlayer failed", error);
    return { status: "error" };
  });
