import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader, AlertCircle, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function TabitTesterModal({ isOpen, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const testLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setResults(null);
    try {
      const response = await base44.functions.invoke('testTabitLogin', {
        email,
        password
      });
      setResults(response.data);
    } catch (err) {
      setResults({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tabit Login API Tester</DialogTitle>
          <DialogDescription>
            Simulate a login to all known Tabit Chef / Office endpoints to see the raw response.
            This helps debug "incorrect password" vs "endpoint blocked" errors.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="api" className="mt-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="api">API Endpoint Tester</TabsTrigger>
            <TabsTrigger value="iframe">Live Browser (Iframe)</TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-4 pt-4">
            <form onSubmit={testLogin} className="flex items-end gap-4">
              <div className="space-y-2 flex-1">
                <Label>Tabit Email</Label>
                <Input 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="e.g. cafe.xoho@gmail.com" 
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label>Password</Label>
                <Input 
                  type="text"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="Password" 
                />
              </div>
              <Button type="submit" disabled={loading || !email || !password} className="bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
                Run Test
              </Button>
            </form>

            {results && (
              <div className="mt-6 border rounded-lg bg-gray-50 overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 border-b font-semibold flex justify-between items-center">
                  <span>Results for: {results.tested_email || 'N/A'}</span>
                  {results.success_endpoint ? (
                    <span className="text-green-600 flex items-center gap-1 text-sm"><CheckCircle2 className="w-4 h-4" /> Success!</span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1 text-sm"><AlertCircle className="w-4 h-4" /> All Failed</span>
                  )}
                </div>
                <div className="p-4 space-y-4">
                  {results.error ? (
                    <div className="text-red-600 font-mono text-sm">{results.error}</div>
                  ) : (
                    <div className="space-y-4">
                      {results.all_results && Object.entries(results.all_results).map(([url, res]) => (
                        <div key={url} className="border rounded bg-white p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-mono text-sm text-blue-700">{url}</span>
                            <span className={`text-xs px-2 py-1 rounded font-bold ${res.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              HTTP {res.status || 'ERR'}
                            </span>
                          </div>
                          
                          {res.error ? (
                            <div className="text-red-600 text-sm mt-2 font-mono break-words">{res.error}</div>
                          ) : (
                            <div className="space-y-2 mt-3">
                              <div className="flex flex-wrap gap-2">
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                                  Token Found: {res.token_found ? 'YES' : 'NO'}
                                </span>
                                {res.organizations && res.organizations.length > 0 && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                    {res.organizations.length} Organizations
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 font-mono mt-2 break-all bg-gray-50 p-2 rounded border">
                                <strong>Raw Response Keys / Data:</strong><br/>
                                {typeof res.response_keys === 'string' ? res.response_keys : JSON.stringify(res.response_keys)}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="iframe" className="pt-4 h-[60vh]">
            <p className="text-sm text-gray-600 mb-2">
              Note: Tabit might block iframe rendering. If so, it will appear blank or show a connection refused error.
            </p>
            <div className="w-full h-full border-2 border-gray-200 rounded-lg overflow-hidden relative bg-white">
              <iframe 
                src="https://il-office.tabit.cloud/auth/login" 
                className="w-full h-full border-none"
                sandbox="allow-same-origin allow-scripts allow-forms"
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}