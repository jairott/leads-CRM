import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://jairott.github.io",
  "http://localhost:5173",
]);

const json = (body: unknown, status = 200, origin = "") => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://jairott.github.io",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  },
});

const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const phoneDigits = (value: string) => value.replace(/\D/g, "");

const timeZoneOffsetMinutes = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((item) => [item.type, item.value]));
  const representedAsUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return (representedAsUtc - date.getTime()) / 60000;
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (!allowedOrigins.has(origin)) return json({ error: "Origen no permitido." }, 403, origin);
  if (req.method === "OPTIONS") return json({}, 200, origin);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  if (req.method === "GET") {
    const now = new Date();
    const end = new Date(now.getTime() + 31 * 86400000);
    const { data, error } = await supabase.from("appointments").select("starts_at").gte("starts_at", now.toISOString()).lte("starts_at", end.toISOString()).not("status", "in", "(cancelled,rescheduled)");
    if (error) return json({ error: "No se pudo cargar la disponibilidad." }, 500, origin);
    const occupiedStarts = (data ?? []).map(({ starts_at }) => {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(starts_at));
      const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
    });
    return json({ occupiedStarts }, 200, origin);
  }

  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405, origin);
  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return json({ error: "Solicitud inválida." }, 400, origin); }
  if (clean(payload.website, 200)) return json({ ok: true }, 200, origin);

  const name = clean(payload.name, 80);
  const phone = clean(payload.phone, 24);
  const email = clean(payload.email, 120).toLowerCase();
  const state = clean(payload.state, 40);
  const coverage = clean(payload.coverage, 40);
  const date = clean(payload.date, 10);
  const time = clean(payload.time, 5);
  const digits = phoneDigits(phone);

  if (name.length < 2 || digits.length < 10 || digits.length > 15) return json({ error: "Revisa el nombre y el teléfono." }, 400, origin);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "El correo no es válido." }, 400, origin);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:(00|30)$/.test(time)) return json({ error: "Selecciona un horario válido." }, 400, origin);

  const wallClockAsUtc = new Date(`${date}T${time}:00Z`);
  const offsetMinutes = timeZoneOffsetMinutes(wallClockAsUtc, "America/Chicago");
  const localCandidate = new Date(wallClockAsUtc.getTime() - offsetMinutes * 60000);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(localCandidate);
  const part = Object.fromEntries(parts.map((item) => [item.type, item.value]));
  const hour = Number(part.hour);
  if (["Sat", "Sun"].includes(part.weekday) || hour < 9 || hour >= 17) return json({ error: "Ese horario no está disponible." }, 400, origin);
  if (localCandidate.getTime() < Date.now() + 30 * 60000 || localCandidate.getTime() > Date.now() + 45 * 86400000) return json({ error: "Selecciona una fecha disponible." }, 400, origin);

  const { data: existingSlot } = await supabase.from("appointments").select("id").eq("starts_at", localCandidate.toISOString()).not("status", "in", "(cancelled,rescheduled)").maybeSingle();
  if (existingSlot) return json({ error: "Ese horario acaba de ocuparse. Elige otro." }, 409, origin);

  const { data: recentContact } = await supabase.from("contacts").select("id").eq("phone", phone).maybeSingle();
  let contactId = recentContact?.id;
  if (!contactId) {
    const { data: contact, error: contactError } = await supabase.from("contacts").insert({ name, phone, email: email || null, city: state || null, source: "landing_page", tags: ["proteccion_familiar"] }).select("id").single();
    if (contactError) return json({ error: "No se pudo guardar tu información." }, 500, origin);
    contactId = contact.id;
  }

  const { data: stage } = await supabase.from("stages").select("id").eq("name", "Cita Agendada").maybeSingle();
  if (stage) {
    const { data: deal } = await supabase.from("deals").select("id").eq("contact_id", contactId).maybeSingle();
    if (deal) await supabase.from("deals").update({ stage_id: stage.id, source: "landing_page" }).eq("id", deal.id);
    else await supabase.from("deals").insert({ contact_id: contactId, stage_id: stage.id, title: `Lead: ${name}`, source: "landing_page" });
  }

  const endsAt = new Date(localCandidate.getTime() + 30 * 60000);
  const { data: appointment, error: appointmentError } = await supabase.from("appointments").insert({ contact_id: contactId, title: "Consulta de protección familiar", appointment_type: "Consulta de protección familiar", coverage_interest: coverage || null, notes: state ? `Estado: ${state}` : null, starts_at: localCandidate.toISOString(), ends_at: endsAt.toISOString(), timezone: "America/Chicago", status: "pending", source: "landing_page", created_by: "public_booking" }).select("id").single();
  if (appointmentError) return json({ error: appointmentError.code === "23505" ? "Ese horario acaba de ocuparse. Elige otro." : "No se pudo guardar la cita." }, appointmentError.code === "23505" ? 409 : 500, origin);
  return json({ ok: true, confirmationId: appointment.id }, 201, origin);
});
