import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader, AlertCircle, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function TabitTesterModal({ isOpen, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [jsonInput, setJsonInput] = useState("");
  const [jsonResults, setJsonResults] = useState(null);

  const handleParseJson = () => {
    try {
      const data = JSON.parse(jsonInput);
      const token = data.il?.access_token || data.access_token;
      setJsonResults({
        success: true,
        tokenFound: !!token,
        tokenPreview: token ? (token.substring(0, 20) + "...") : null,
        organizationsCount: data.organizations?.length || 0,
        keys: Object.keys(data)
      });
    } catch (err) {
      setJsonResults({ success: false, error: err.message });
    }
  };

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

        <Tabs defaultValue="json" className="mt-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="api">API Endpoint Tester</TabsTrigger>
            <TabsTrigger value="iframe">Live Browser (Iframe)</TabsTrigger>
            <TabsTrigger value="json">Paste JSON</TabsTrigger>
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

          <TabsContent value="json" className="space-y-4 pt-4">
            <p className="text-sm text-gray-600">
              Paste the JSON response you extracted from the network tab here.
            </p>
            <Textarea 
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste JSON here..."
              className="h-64 font-mono text-sm"
            />
            <Button onClick={handleParseJson} disabled={!jsonInput} className="bg-blue-600 hover:bg-blue-700 text-white">
              Parse JSON
            </Button>
            
            {jsonResults && (
              <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                {jsonResults.success ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-700 font-medium">
                      <CheckCircle2 className="w-5 h-5" /> Successfully Parsed
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="bg-white p-3 rounded border">
                        <div className="text-xs text-gray-500 font-bold uppercase">Token Found</div>
                        <div className="mt-1 font-mono text-sm">{jsonResults.tokenFound ? 'YES' : 'NO'}</div>
                        {jsonResults.tokenPreview && (
                          <div className="mt-1 text-xs text-gray-400 break-all">{jsonResults.tokenPreview}</div>
                        )}
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="text-xs text-gray-500 font-bold uppercase">Organizations</div>
                        <div className="mt-1 font-mono text-sm">{jsonResults.organizationsCount}</div>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded border mt-2">
                      <div className="text-xs text-gray-500 font-bold uppercase mb-1">Response Keys</div>
                      <div className="flex flex-wrap gap-2">
                        {jsonResults.keys.map(k => (
                          <span key={k} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700 font-mono">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Invalid JSON: {jsonResults.error}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}