import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader, Link as LinkIcon, Copy, CheckCircle, Store, Users, ExternalLink } from "lucide-react";

export default function TestInvitesPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState([]);
  const [copied, setCopied] = useState(null);
  
  // Test form states
  const [testEmail, setTestEmail] = useState("test@example.com");
  const [testName, setTestName] = useState("Test User");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (currentUser.role === 'admin') {
        const allInvites = await base44.entities.UserInvite.filter({}, '-created_date', 20);
        setInvites(allInvites);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const createTestInvite = async (type) => {
    try {
      setCreating(true);
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const inviteData = {
        token,
        email: testEmail,
        full_name: testName,
        invite_type: type,
        inviter_email: user.email,
        inviter_name: user.full_name,
        expires_at: expiresAt.toISOString(),
        used: false
      };

      if (type === 'chain_store') {
        inviteData.chain_id = "test-chain-123";
        inviteData.chain_name = "Test Chain";
        inviteData.store_name = "Test Branch Store";
      } else {
        inviteData.store_id = "test-store-456";
        inviteData.store_name = "Test Main Store";
        inviteData.role = "worker";
      }

      await base44.entities.UserInvite.create(inviteData);
      await loadData();
      
      alert(`Invite created! Token: ${token}`);
    } catch (error) {
      console.error("Error creating invite:", error);
      alert("Error: " + error.message);
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (token) => {
    const link = `${window.location.origin}/pages/Register?invite=${token}`;
    navigator.clipboard.writeText(link);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const openLink = (token) => {
    const link = `${window.location.origin}/pages/Register?invite=${token}`;
    window.open(link, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-600">Admin access required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">🧪 Test Invite Links</h1>
        
        {/* Create Test Invites */}
        <Card>
          <CardHeader>
            <CardTitle>Create Test Invites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Test Email</Label>
                <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
              </div>
              <div>
                <Label>Test Name</Label>
                <Input value={testName} onChange={(e) => setTestName(e.target.value)} />
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button 
                onClick={() => createTestInvite('chain_store')}
                disabled={creating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Store className="w-4 h-4 mr-2" />
                Create Chain Store Invite
              </Button>
              <Button 
                onClick={() => createTestInvite('store_user')}
                disabled={creating}
                className="bg-green-600 hover:bg-green-700"
              >
                <Users className="w-4 h-4 mr-2" />
                Create Store User Invite
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Invites */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invites ({invites.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {invites.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No invites yet</p>
            ) : (
              <div className="space-y-3">
                {invites.map((invite) => (
                  <div 
                    key={invite.id} 
                    className={`p-4 rounded-lg border ${invite.used ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {invite.invite_type === 'chain_store' ? (
                          <Store className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Users className="w-5 h-5 text-green-600" />
                        )}
                        <div>
                          <p className="font-semibold">{invite.full_name}</p>
                          <p className="text-sm text-gray-500">{invite.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              invite.invite_type === 'chain_store' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {invite.invite_type === 'chain_store' ? 'Chain Store' : 'Store User'}
                            </span>
                            {invite.role && (
                              <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                                {invite.role}
                              </span>
                            )}
                            {invite.used && (
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                                ✓ Used
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {!invite.used && (
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyLink(invite.token)}
                          >
                            {copied === invite.token ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openLink(invite.token)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {!invite.used && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono break-all">
                        /pages/Register?invite={invite.token}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}