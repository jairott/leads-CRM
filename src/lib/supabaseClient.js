import { createClient } from "@supabase/supabase-js";

// Mismo proyecto que ya usan las paginas publicas (src/pages/PublicBooking.jsx)
// como respaldo — la anon key es publica por diseno (protegida por RLS). Sin
// esto, un build sin VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY definidas hace
// que createClient() explote al cargar el chunk del CRM y la app quede en
// blanco, porque el lazy import de CrmApp no tiene error boundary.
const FALLBACK_SUPABASE_URL = "https://glxmakgcvzympuioqvlp.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdseG1ha2djdnp5bXB1aW9xdmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDI5NDUsImV4cCI6MjEwMjcxODk0NX0.WDAfmLq-ySTbAMH8rWfyHCtGdQRgOJzwfLU6jenbWks";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
