import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'welcome@levaleurmanagement.xyz'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { email, first_name, last_name, temp_code } = await req.json()

    if (!email || !first_name || !temp_code) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Willkommen bei Le Valeur</title>
</head>
<body style="margin:0;padding:0;background-color:#0A1614;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A1614;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#0F2A1F;border-radius:16px;border:1px solid #1E4535;overflow:hidden;">
          <tr>
            <td style="padding:40px 40px 32px;text-align:center;border-bottom:1px solid #1E4535;">
              <img src="https://v0-financial-analytics-dashboard-ten-chi.vercel.app/logo.png" width="56" height="56" style="border-radius:8px;display:block;margin:0 auto 16px;" alt="Le Valeur" />
              <p style="margin:0;color:#7A8F80;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Le Valeur Management AG</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;color:#F5F5EF;font-size:24px;font-weight:600;">Willkommen, ${first_name}.</h1>
              <p style="margin:0 0 32px;color:#7A8F80;font-size:14px;line-height:1.7;">Ihr pers&ouml;nliches Wealth Management Dashboard wurde eingerichtet. Verwenden Sie den untenstehenden Zugangscode f&uuml;r Ihre erste Anmeldung.</p>
              <div style="background-color:#0A1614;border:1px solid #1E4535;border-radius:12px;padding:28px;text-align:center;margin-bottom:32px;">
                <p style="margin:0 0 12px;color:#7A8F80;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Ihr tempor&auml;rer Zugangscode</p>
                <p style="margin:0;color:#D4F377;font-size:40px;font-weight:700;letter-spacing:10px;font-family:'Courier New',monospace;">${temp_code}</p>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <a href="https://dashboard.levaleurmanagement.xyz/login" style="display:inline-block;background-color:#0F2A1F;border:1px solid #D4F377;color:#D4F377;font-size:13px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:1px;">Zum Dashboard anmelden &rarr;</a>
                  </td>
                </tr>
              </table>
              <div style="padding:20px;background-color:#0A1614;border-radius:8px;border-left:3px solid #D4F377;">
                <p style="margin:0;color:#7A8F80;font-size:13px;line-height:1.6;"><strong style="color:#F5F5EF;">Sicherheitshinweis:</strong> Nach der ersten Anmeldung werden Sie aufgefordert, ein pers&ouml;nliches Passwort festzulegen. Teilen Sie diesen Code mit niemandem.</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #1E4535;text-align:center;">
              <p style="margin:0 0 4px;color:#3A4F40;font-size:12px;">Le Valeur Management AG</p>
              <p style="margin:0;color:#3A4F40;font-size:12px;">Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht darauf.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: `Ihr Zugang zum Le Valeur Dashboard – Code: ${temp_code}`,
        html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
