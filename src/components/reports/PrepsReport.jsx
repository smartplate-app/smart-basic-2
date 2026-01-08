import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrepsReport() {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader><CardTitle>Preps Recipes</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Planned area for prep recipes cost/yield breakdown. Once recipe/prep entities exist, this will summarize
            ingredients, batch yields, and cost per portion.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}