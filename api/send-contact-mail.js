const { sendJson, escapeHtml, sendEmail } = require("./_mail.js");

const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || process.env.INTAKE_FROM_EMAIL || "MNRV <intake@mnrv.nl>";
const ADMIN_EMAIL = process.env.CONTACT_ADMIN_EMAIL || process.env.INTAKE_ADMIN_EMAIL || "info@mnrv.nl";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INTERESTS = {
  agents: "AI Agents",
  website: "Website",
  uxui: "UX/UI",
  strategie: "Strategie",
  integraties: "Integraties",
  maatwerk: "Maatwerk"
};

function clean(value, max) {
  return String(value || "").trim().slice(0, max);
}

function readBody(req) {
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch (error) { return {}; }
  }
  return req.body || {};
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 500, { error: "Mail is niet geconfigureerd" });
  }

  const body = readBody(req);

  // Honeypot: real visitors never see this field, bots tend to fill it.
  if (clean(body.website, 200)) {
    return sendJson(res, 200, { ok: true });
  }

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const company = clean(body.company, 120);
  const phone = clean(body.phone, 40);
  const message = clean(body.message, 2000);
  const source = clean(body.source, 40) || "onbekend";
  const interests = (Array.isArray(body.interests) ? body.interests : [])
    .filter((key) => Object.prototype.hasOwnProperty.call(INTERESTS, key))
    .map((key) => INTERESTS[key]);

  const fields = [];
  if (name.length < 2) fields.push("name");
  if (!EMAIL_RE.test(email)) fields.push("email");
  if (message.length < 10) fields.push("message");
  if (fields.length) {
    return sendJson(res, 400, { error: "Controleer de gemarkeerde velden", fields });
  }

  const subjectName = `${name}${company ? ` (${company})` : ""}`.replace(/[\r\n]+/g, " ");
  const rows = [
    ["Naam", name],
    ["E-mail", email],
    ["Bedrijf", company || "-"],
    ["Telefoon", phone || "-"],
    ["Interesse", interests.length ? interests.join(", ") : "-"],
    ["Bron", source]
  ].map(([label, value]) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;font-weight:bold;vertical-align:top;">${label}</td>
        <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(value)}</td>
      </tr>`).join("");

  const html = `
    <h1>Nieuw contactbericht</h1>
    <table style="border-collapse:collapse;width:100%;">${rows}</table>
    <h2>Bericht</h2>
    <p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
  `;

  try {
    const result = await sendEmail({
      from: FROM_EMAIL,
      to: [ADMIN_EMAIL],
      reply_to: [email],
      subject: `MNRV contact - ${subjectName}`,
      html
    });
    return sendJson(res, 200, { ok: true, id: result.id || null });
  } catch (error) {
    return sendJson(res, 502, { error: "Versturen lukte niet. Mail ons direct via info@mnrv.nl." });
  }
};
