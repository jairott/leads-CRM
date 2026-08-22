import { useEffect, useState, useCallback } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { ContactDetailPanel } from "../components/ContactDetailPanel";

const emptyForm = { name: "", phone: "", email: "", city: "", source: "manual" };

export const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  const loadContacts = useCallback(async () => {
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });
    setContacts(data ?? []);
  }, []);

  useEffect(() => {
    loadContacts();
    const channel = supabase
      .channel("contacts-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, loadContacts)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [loadContacts]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name && !form.phone) return;
    setSaving(true);

    const { data: contact, error } = await supabase
      .from("contacts")
      .insert(form)
      .select()
      .single();

    if (!error && contact) {
      const { data: firstStage } = await supabase
        .from("stages")
        .select("id")
        .order("position")
        .limit(1)
        .single();

      if (firstStage) {
        await supabase.from("deals").insert({
          contact_id: contact.id,
          stage_id: firstStage.id,
          title: `Lead: ${contact.name || contact.phone}`,
          source: form.source,
        });
      }
    }

    setSaving(false);
    setForm(emptyForm);
  };

  const deleteContact = async (e, contact) => {
    e.stopPropagation();
    const ok = window.confirm(
      `¿Eliminar a ${contact.name || contact.phone || "este contacto"}? Esto borra también sus mensajes, citas y actividad. No se puede deshacer.`,
    );
    if (!ok) return;

    await supabase.from("contacts").delete().eq("id", contact.id);

    if (selectedContact?.id === contact.id) {
      setSelectedContact(null);
    }
  };

  return (
    <div className="contacts-page">
      <form className="contact-form" onSubmit={handleCreate}>
        <h2>Nuevo contacto</h2>
        <input
          placeholder="Nombre"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="Teléfono"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          placeholder="Correo"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          placeholder="Ciudad"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />
        <select
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
        >
          <option value="manual">Manual</option>
          <option value="meta_ads">Meta Ads</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="referido">Referido</option>
        </select>
        <button type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Agregar contacto"}
        </button>
      </form>

      <div className="contact-table">
        <div className="contact-table-header">
          <span>Nombre</span>
          <span>Teléfono</span>
          <span>Correo</span>
          <span>Ciudad</span>
          <span>Origen</span>
          <span></span>
        </div>
        {contacts.map((c) => (
          <div
            key={c.id}
            className="contact-table-row"
            onClick={() => setSelectedContact(c)}
            style={{ cursor: "pointer" }}
          >
            <span>{c.name || "—"}</span>
            <span>{c.phone || "—"}</span>
            <span>{c.email || "—"}</span>
            <span>{c.city || "—"}</span>
            <span>
              <span className="source-badge">{c.source || "manual"}</span>
            </span>
            <button
              type="button"
              className="contact-row-delete"
              title="Eliminar contacto"
              onClick={(e) => deleteContact(e, c)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {contacts.length === 0 && <div className="pipeline-empty">Sin contactos todavía</div>}
      </div>

      {selectedContact && (
        <ContactDetailPanel contact={selectedContact} onClose={() => setSelectedContact(null)} />
      )}
    </div>
  );
};
