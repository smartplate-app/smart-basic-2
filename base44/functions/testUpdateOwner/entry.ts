import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // Try to fetch one
  const recipes = await base44.asServiceRole.entities.Recipe.filter({ created_by: 'service+0e5bb138-a3c3-4e4f-b3bb-9af212a26df1@no-reply.base44.com' }, 'name', 1);
  if (recipes.length === 0) return Response.json({ error: 'No recipe found' });
  
  const r = recipes[0];
  // Try to update it using a special syntax or just recreating it?
  
  // Let's see if we can do an update that affects root
  // The SDK might not support it. Let's return the recipe to inspect.
  return Response.json({ recipe: r });
});