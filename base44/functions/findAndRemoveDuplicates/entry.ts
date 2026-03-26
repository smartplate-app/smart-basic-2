import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { type } = await req.json(); // 'items' or 'recipes'

    let deletedCount = 0;

    // Helper to process duplicates
    const processDuplicates = async (entities, entityName) => {
      const groups = {};
      entities.forEach(item => {
        const name = (item.name || '').trim().toLowerCase();
        if (!name) return;
        if (!groups[name]) groups[name] = [];
        groups[name].push(item);
      });

      let count = 0;
      for (const name in groups) {
        if (groups[name].length > 1) {
          // Sort by updated_date desc (or created_date), keep the first one (most recent)
          groups[name].sort((a, b) => {
            const dateA = new Date(a.updated_date || a.created_date).getTime();
            const dateB = new Date(b.updated_date || b.created_date).getTime();
            return dateB - dateA;
          });
          
          const [keep, ...remove] = groups[name];
          
          // Delete the rest
          for (const item of remove) {
            try {
                if (entityName === 'Item') {
                    await base44.entities.Item.delete(item.id);
                } else if (entityName === 'Recipe') {
                    await base44.entities.Recipe.delete(item.id);
                }
                count++;
            } catch (e) {
                console.error(`Failed to delete duplicate ${entityName} ${item.id}:`, e);
            }
          }
        }
      }
      return count;
    };

    if (type === 'items' || type === 'all') {
      const items = await base44.entities.Item.filter({ created_by: user.email });
      deletedCount += await processDuplicates(items, 'Item');
    }

    if (type === 'recipes' || type === 'all') {
      const recipes = await base44.entities.Recipe.filter({ created_by: user.email });
      deletedCount += await processDuplicates(recipes, 'Recipe');
    }

    return Response.json({ success: true, deletedCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});