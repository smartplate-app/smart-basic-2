import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PosCogsPlannedReport() {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader><CardTitle>POS COGS (Planned)</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Planned POS COGS view. When POS recipes and mappings are available, this will show planned COGS by menu item,
            portion sizes, and theoretical vs. target costs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}