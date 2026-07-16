/**
 * ATU Simulation Hospital — Notion Secure Bridge
 *
 * Deploy as a Cloudflare Worker or adapt to another serverless platform.
 * Required environment secrets:
 *   NOTION_TOKEN
 *   MED_ADMIN_DATABASE_ID
 *
 * Never place the Notion token in index.html or client-side JavaScript.
 */

const NOTION_VERSION = "2022-06-28";

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (request.method !== "POST") {
      return json({ error: "POST required" }, 405, cors);
    }

    try {
      const body = await request.json();

      if (body.action !== "createMedicationAdministration") {
        return json({ error: "Unsupported action" }, 400, cors);
      }

      const r = body.record;
      const notionBody = {
        parent: { database_id: env.MED_ADMIN_DATABASE_ID },
        properties: {
          "Name": {
            title: [{ text: { content: `${r.patientName} — ${r.medication}` } }]
          },
          "Patient Name": {
            rich_text: [{ text: { content: r.patientName || "" } }]
          },
          "MRN": {
            rich_text: [{ text: { content: r.mrn || "" } }]
          },
          "Medication": {
            rich_text: [{ text: { content: r.medication || "" } }]
          },
          "Dose": {
            rich_text: [{ text: { content: r.dose || "" } }]
          },
          "Route": {
            select: r.route ? { name: r.route } : null
          },
          "Scheduled Time": {
            rich_text: [{ text: { content: r.scheduledTime || "" } }]
          },
          "Administered At": {
            date: r.administeredAt ? { start: new Date(r.administeredAt).toISOString() } : null
          },
          "Student Nurse": {
            rich_text: [{ text: { content: r.student || "" } }]
          },
          "Site / Line": {
            rich_text: [{ text: { content: r.site || "" } }]
          },
          "Notes": {
            rich_text: [{ text: { content: r.notes || "" } }]
          },
          "Barcode": {
            rich_text: [{ text: { content: r.barcode || "" } }]
          },
          "Status": {
            select: { name: "Given" }
          }
        }
      };

      const response = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.NOTION_TOKEN}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(notionBody)
      });

      const data = await response.json();
      if (!response.ok) {
        return json({ error: "Notion API error", details: data }, response.status, cors);
      }

      return json({ ok: true, notionPageId: data.id }, 200, cors);
    } catch (error) {
      return json({ error: error.message || "Unknown error" }, 500, cors);
    }
  }
};

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" }
  });
}
