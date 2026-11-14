import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import icon from "@/assets/app-icon.jpg";
import { checkName, nameToEmail, PASSWORD_MIN } from "../net/identity";
import { registerPlayer } from "../net/register.functions";

const NAME_ERRORS = {
  short: "الاسم قصير جداً (حرفان على الأقل)",
  long: "الاسم طويل جداً (20 حرفاً كحد أقصى)",
  chars: "استخدم حروفاً وأرقاماً فقط",
} as const;

export function LoginScreen() {
  const register = useServerFn(registerPlayer);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const n = checkName(name);
    if (!n.ok) return setError(NAME_ERRORS[n.reason]);
    if (password.length < PASSWORD_MIN) return setError(`كلمة المرور ${PASSWORD_MIN} أحرف على الأقل`);
    setBusy(true);
    try {
      const email = await nameToEmail(n.key);
      const first = await supabase.auth.signInWithPassword({ email, password });
      if (!first.error) return;
      const res = await register({ data: { name: n.display, password } });
      if (res.status === "taken") return setError("هذا الاسم مسجّل من قبل، وكلمة المرور غير صحيحة");
      if (res.status === "weak") return setError("كلمة المرور ضعيفة أو شائعة، اختر كلمة أقوى");
      if (res.status !== "created") return setError("تعذّر إنشاء الحساب، حاول مرة أخرى");
      const second = await supabase.auth.signInWithPassword({ email, password });
      if (second.error) setError("تم إنشاء بيتك، لكن تعذّر الدخول. حاول مرة أخرى");
    } catch {
      setError("حدث خطأ في الاتصال، حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen" dir="rtl">
      <form
        className="login-card"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <img src={icon} alt="" width={1024} height={1024} className="login-icon" />
        <h1 className="login-title">مدينة المشتركين</h1>
        <p className="login-sub">اكتب اسمك لتحصل على بيت في المدينة. إذا كان لديك بيت، ادخل بنفس الاسم وكلمة المرور.</p>
        <label className="login-field">
          <span>اسمك</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoComplete="username"
            placeholder="مثال: أبو فهد"
          />
        </label>
        <label className="login-field">
          <span>كلمة المرور</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="٦ أحرف على الأقل"
          />
        </label>
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="login-btn" disabled={busy}>
          {busy ? "جاري الدخول…" : "ادخل المدينة"}
        </button>
        <p className="login-note">احفظ كلمة المرور جيداً، فلا يمكن استرجاعها.</p>
      </form>
    </div>
  );
}
