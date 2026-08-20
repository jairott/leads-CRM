import { useEffect, useState, useCallback, useRef } from "react";
import { Bot, BotOff } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export const Inbox = () => {
  const [contacts, setContacts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef(null);

  const loadContacts = useCallback(async () => {
    const { data } = await supabase
      .from("contacts")
      .select("*, messages(body, created_at)")
      .order("updated_at", { ascending: false });
    setContacts(data ?? []);
    if (!selectedId && data?.length) {
      setSelectedId(data[0].id);
    }
  }, [selectedId]);

  useEffect(() => {
    loadContacts();
    const channel = supabase
      .channel("inbox-contacts")
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, loadContacts)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [loadContacts]);

  useEffect(() => {
    if (!selectedId) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("contact_id", selectedId)
        .order("created_at", { ascending: true });
      setMessages(data ?? []);
    };

    loadMessages();

    const channel = supabase
      .channel(`messages-${selectedId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `contact_id=eq.${selectedId}` },
        (payload) => setMessages((prev) => [...prev, payload.new]),
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !selectedId) return;

    await supabase.from("messages").insert({
      contact_id: selectedId,
      channel: "whatsapp",
      direction: "out",
      body: draft.trim(),
      status: "pending",
    });

    setDraft("");
  };

  const selectedContact = contacts.find((c) => c.id === selectedId);

  const toggleAiPaused = async () => {
    if (!selectedContact) return;
    await supabase
      .from("contacts")
      .update({ ai_paused: !selectedContact.ai_paused })
      .eq("id", selectedContact.id);
  };

  return (
    <div className="inbox-layout">
      <div className="inbox-list">
        {contacts.map((contact) => (
          <button
            key={contact.id}
            className={`inbox-list-item ${contact.id === selectedId ? "active" : ""}`}
            onClick={() => setSelectedId(contact.id)}
          >
            <div className="inbox-list-name">{contact.name || contact.phone || "Sin nombre"}</div>
            <div className="inbox-list-preview">
              {contact.messages?.[contact.messages.length - 1]?.body ?? "Sin mensajes"}
            </div>
          </button>
        ))}
        {contacts.length === 0 && <div className="pipeline-empty">Sin contactos todavía</div>}
      </div>

      <div className="inbox-thread">
        {selectedContact ? (
          <>
            <div className="inbox-thread-header">
              {selectedContact.name || selectedContact.phone || "Sin nombre"}
              <span className="inbox-thread-phone">{selectedContact.phone}</span>
              <button
                type="button"
                className={`ai-toggle-btn ${selectedContact.ai_paused ? "paused" : ""}`}
                onClick={toggleAiPaused}
                title={selectedContact.ai_paused ? "Reactivar IA" : "Pausar IA y tomar control manual"}
              >
                {selectedContact.ai_paused ? <BotOff size={15} /> : <Bot size={15} />}
                {selectedContact.ai_paused ? "IA pausada" : "IA activa"}
              </button>
            </div>
            {selectedContact.ai_paused && (
              <div className="ai-paused-banner">
                🙋 Tomaste control manual de esta conversación — la IA no le va a responder a este contacto hasta que reactives.
              </div>
            )}
            <div className="inbox-thread-body">
              {messages.map((m) => (
                <div key={m.id} className={`bubble bubble-${m.direction}`}>
                  {m.body}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form className="inbox-thread-input" onSubmit={sendMessage}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escribe un mensaje..."
              />
              <button type="submit">Enviar</button>
            </form>
          </>
        ) : (
          <div className="page-loading">Selecciona un contacto</div>
        )}
      </div>
    </div>
  );
};
