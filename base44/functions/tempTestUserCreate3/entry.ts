import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const hashedPassword = await hashPassword('123456');
    const newUser = await base44.asServiceRole.entities.User.create({
        email: 'test_direct_insert@test.local',
        full_name: 'Test Direct',
        role: 'user',
        password: hashedPassword,
        business_name: 'Test',
        business_address: 'Test'
    });
    return Response.json({ success: true, newUser });
  } catch (error) {
    return Response.json({ success: false, error: error.message });
  }
});