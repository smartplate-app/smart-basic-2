import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const appId = Deno.env.get('BASE44_APP_ID');
        const { email, otp } = await req.json();
        
        // Call verifyOtp directly via Base44 REST API
        const res = await fetch(`https://api.base44.com/api/apps/${appId}/auth/verify_otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-App-Id': appId
            },
            body: JSON.stringify({ email, otp_code: otp })
        });
        
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { data = text.substring(0, 200); }
        return Response.json({ status: res.status, data });
        
    } catch (e) {
        return Response.json({ success: false, error: e.message });
    }
});