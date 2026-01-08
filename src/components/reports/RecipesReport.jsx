import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecipesReport() {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader><CardTitle>Recipes & Preps</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            This section will combine Recipes, Preps, and POS Recipes for consolidated costing and yield.
            No recipe data entities detected yet. Once they exist/imported, this tab will summarize costs per recipe,
            prep roll-ups, and POS-mapped portions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}