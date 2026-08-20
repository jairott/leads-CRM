export const STATUS_LABELS = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Realizada",
  no_show: "No Show",
  cancelled: "Cancelada",
  rescheduled: "Reprogramada",
};

export const STATUS_COLORS = {
  pending: "#f59e0b",
  confirmed: "#0ea5e9",
  completed: "#10b981",
  no_show: "#ef4444",
  cancelled: "#94a3b8",
  rescheduled: "#8b5cf6",
};

export const formatAppointmentTime = (isoString, timezone) => {
  const date = new Date(isoString);
  return date.toLocaleString("es", {
    timeZone: timezone || "America/Chicago",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatAppointmentDay = (isoString, timezone) => {
  const date = new Date(isoString);
  return date.toLocaleDateString("es", {
    timeZone: timezone || "America/Chicago",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

export const formatAppointmentClock = (isoString, timezone) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString("es", {
    timeZone: timezone || "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};
