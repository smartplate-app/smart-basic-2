import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import RecipesReport from "../components/reports/RecipesReport";
import PrepsReport from "../components/reports/PrepsReport";
import PosCogsPlannedReport from "../components/reports/PosCogsPlannedReport";

export default function COGS() {
  const [tab, setTab] = useState("recipes");
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">COGS</CardTitle>
          </CardHeader>
        </Card>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-xl">
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
            <TabsTrigger value="preps">Preps</TabsTrigger>
            <TabsTrigger value="pos">POS COGS Planned</TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="recipes"><RecipesReport /></TabsContent>
            <TabsContent value="preps"><PrepsReport /></TabsContent>
            <TabsContent value="pos"><PosCogsPlannedReport /></TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}