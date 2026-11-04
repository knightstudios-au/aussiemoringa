// Receives the enquiry form and answers straight away, then passes the
// message to FormSubmit in the background. FormSubmit can take 20 seconds or
// more to answer, which made the form time out in the browser.
const TO = "ausgold@gmail.com";

export async function onRequestPost(context) {
  const { request, waitUntil } = context;
  const wantsJson = (request.headers.get("accept") || "").includes("application/json");
  const done = (ok, status = 200) =>
    wantsJson
      ? new Response(JSON.stringify({ ok }), { status, headers: { "content-type": "application/json" } })
      : new Response(null, { status: 303, headers: { Location: ok ? "/?sent=1#enquire" : "/?error=1#enquire" } });

  let form;
  try { form = await request.formData(); } catch { return done(false, 400); }

  // Honeypot: bots fill the hidden field. Pretend it worked.
  if (form.get("_honey")) return done(true);

  const name = String(form.get("name") || "").trim().slice(0, 200);
  const email = String(form.get("email") || "").trim().slice(0, 200);
  const phone = String(form.get("phone") || "").trim().slice(0, 100);
  const message = String(form.get("message") || "").trim().slice(0, 5000);
  if (!name || !email || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return done(false, 400);

  const send = fetch(`https://formsubmit.co/ajax/${TO}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      origin: "https://aussiemoringa.com",
      referer: "https://aussiemoringa.com/",
    },
    body: JSON.stringify({
      _subject: "New enquiry from aussiemoringa.com",
      _captcha: "false",
      _replyto: email,
      name,
      email,
      phone: phone || "(none)",
      message,
    }),
  }).then(async (r) => {
    if (!r.ok) console.error("FormSubmit failed", r.status, await r.text().catch(() => ""));
  }).catch((e) => console.error("FormSubmit error", String(e)));

  waitUntil(send);
  return done(true);
}
