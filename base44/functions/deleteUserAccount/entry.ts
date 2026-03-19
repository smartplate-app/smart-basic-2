import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify the requesting user is an admin
    const requestingUser = await base44.auth.me();
    if (!requestingUser || requestingUser.role !== 'admin') {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized. Only admins can delete users.' 
      }, { status: 403 });
    }

    const { user_id, email } = await req.json();

    if (!user_id) {
      return Response.json({ 
        success: false, 
        error: 'user_id is required' 
      }, { status: 400 });
    }

    // Delete the user entity record using service role
    await base44.asServiceRole.entities.User.delete(user_id);

    // Note: base44's auth system will automatically revoke authentication
    // when the User entity is deleted

    return Response.json({ 
      success: true,
      message: 'User deleted successfully. Authentication has been revoked.'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Failed to delete user'
    }, { status: 500 });
  }
});