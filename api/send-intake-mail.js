const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM_EMAIL = process.env.INTAKE_FROM_EMAIL || "MNRV <intake@mnrv.nl>";
const ADMIN_EMAIL = process.env.INTAKE_ADMIN_EMAIL || "info@mnrv.nl";
const SEND_CLIENT_COPY = process.env.INTAKE_SEND_CLIENT_COPY !== "false";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatAnswerValue(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  if (value && typeof value === "object") return JSON.stringify(value, null, 2);
  return value || "-";
}

function buildAnswersTable(answers) {
  return Object.entries(answers || {})
    .filter(([key]) => key !== "uploads")
    .map(([key, value]) => {
      return `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;font-weight:bold;vertical-align:top;">${escapeHtml(key)}</td>
          <td style="padding:8px;border:1px solid #ddd;white-space:pre-wrap;">${escapeHtml(formatAnswerValue(value))}</td>
        </tr>`;
    })
    .join("");
}

function buildUploadsList(uploads) {
  if (!Array.isArray(uploads) || uploads.length === 0) return "<p>Geen bestanden geupload.</p>";

  return `
    <ul>
      ${uploads.map(upload => `<li>${escapeHtml(upload.name)} (${escapeHtml(upload.bucket)}/${escapeHtml(upload.path)})</li>`).join("")}
    </ul>`;
}

async function sendEmail(payload) {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || data.error || "Resend request failed";
    throw new Error(message);
  }

  return data;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 500, { error: "RESEND_API_KEY is not configured" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const {
      intake_id: intakeId,
      client_email: clientEmail,
      client_name: clientName,
      company_name: companyName,
      answers,
      uploads
    } = body || {};

    if (!clientEmail || !clientName) {
      return sendJson(res, 400, { error: "client_email and client_name are required" });
    }

    const subject = `MNRV website intake - ${companyName || clientName}`;
    const answersTable = buildAnswersTable(answers);
    const uploadsList = buildUploadsList(uploads);

    const adminHtml = `
      <h1>Nieuwe website intake</h1>
      <p><strong>Naam:</strong> ${escapeHtml(clientName)}</p>
      <p><strong>Bedrijf:</strong> ${escapeHtml(companyName || "-")}</p>
      <p><strong>E-mail:</strong> ${escapeHtml(clientEmail)}</p>
      <p><strong>Submission ID:</strong> ${escapeHtml(intakeId)}</p>
      <h2>Antwoorden</h2>
      <table style="border-collapse:collapse;width:100%;">${answersTable}</table>
      <h2>Uploads</h2>
      ${uploadsList}
    `;

    const clientHtml = `
      <h1>Bedankt voor je intake</h1>
      <p>Hi ${escapeHtml(clientName)},</p>
      <p>We hebben je website intake ontvangen. MNRV gaat ermee aan de slag.</p>
      <p><strong>Submission ID:</strong> ${escapeHtml(intakeId)}</p>
      <h2>Je antwoorden</h2>
      <table style="border-collapse:collapse;width:100%;">${answersTable}</table>
    `;

    const adminResult = await sendEmail({
      from: FROM_EMAIL,
      to: [ADMIN_EMAIL],
      reply_to: [clientEmail],
      subject,
      html: adminHtml
    });

    let clientResult = null;

    if (SEND_CLIENT_COPY) {
      clientResult = await sendEmail({
        from: FROM_EMAIL,
        to: [clientEmail],
        reply_to: [ADMIN_EMAIL],
        subject: "Kopie van je MNRV website intake",
        html: clientHtml
      });
    }

    return sendJson(res, 200, {
      ok: true,
      admin: adminResult,
      client: clientResult,
      client_copy_enabled: SEND_CLIENT_COPY
    });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || "Mail sending failed" });
  }
};
