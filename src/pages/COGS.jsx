import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader, Shield } from "lucide-react";
import { base44 } from "@/api/base44Client";
import RecipesReport from "../components/reports/RecipesReport";
import PrepsReport from "../components/reports/PrepsReport";
import MonthlyCogsReport from "../components/reports/MonthlyCogsReport.jsx";

export default function COGS() {
  const [tab, setTab] = useState("recipes");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const [pass, setPass] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <Shield className="w-5 h-5" /> Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Only administrators can access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">COGS</CardTitle>
          </CardHeader>
        </Card>

        {unlocked ? (
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-xl">
              <TabsTrigger value="recipes">POS Recipes</TabsTrigger>
              <TabsTrigger value="preps">Preps</TabsTrigger>
              <TabsTrigger value="monthly">Monthly COGS</TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <TabsContent value="recipes"><RecipesReport /></TabsContent>
              <TabsContent value="preps"><PrepsReport /></TabsContent>
              <TabsContent value="monthly"><MonthlyCogsReport /></TabsContent>
            </div>
          </Tabs>
        ) : (
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-xl">COGS Report – Enter Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Enter passcode"
              />
              <Button
                onClick={() => {
                  if ((pass || '').trim() === '2233') setUnlocked(true);
                  else alert('Wrong password');
                }}
                className="bg-gray-900 hover:bg-gray-800"
              >
                Unlock
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}