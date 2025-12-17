import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Copy, Loader } from 'lucide-react';

export default function ChainManagement() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chain, setChain] = useState(null);
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState({
    chainName: '',
    storeName: '',
    managerName: '',
    managerEmail: ''
  });
  const [inviteLink, setInviteLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const u = await base44.auth.me();
      setUser(u);
      let chainData = null;
      // Find chain by head email
      const chains = await base44.entities.Chain.filter({ head_store_user_email: u.email });
      if (chains?.length) {
        chainData = chains[0];
        setChain(chainData);
        const storesData = await base44.entities.ChainStore.filter({ chain_id: chainData.id });
        setStores(storesData || []);
      }
      setForm(prev => ({ ...prev, chainName: chainData?.name || `${u.business_name || u.full_name || 'My'} Chain` }));
      setLoading(false);
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.storeName || !form.managerEmail || !form.managerName) {
      alert('Please fill all fields');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await base44.functions.invoke('createChainStoreInvite', {
        chainName: form.chainName,
        storeName: form.storeName,
        inviteeEmail: form.managerEmail,
        inviteeName: form.managerName,
        sendEmail: false
      });
      if (!data?.success) throw new Error(data?.error || 'Failed to create invite');
      setInviteLink(data.inviteLink);
      setChain(data.chain);
      const storesData = await base44.entities.ChainStore.filter({ chain_id: data.chain.id });
      setStores(storesData || []);
      setForm(prev => ({ ...prev, storeName: '', managerEmail: '', managerName: '' }));
    } catch (err) {
      alert('Error: ' + (err.message || 'Failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-purple-700" />
          <h1 className="text-3xl font-bold">Chain Management</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Chain Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Chain Name</Label>
                <Input value={form.chainName} onChange={(e) => setForm({ ...form, chainName: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <div className="mt-2">
                  {chain ? (
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  ) : (
                    <Badge variant="outline">Will be created</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add New Restaurant</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Restaurant Name</Label>
                  <Input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} placeholder="Branch Name" />
                </div>
                <div>
                  <Label>Manager Full Name</Label>
                  <Input value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} placeholder="John Doe" />
                </div>
                <div className="md:col-span-2">
                  <Label>Manager Email</Label>
                  <Input type="email" value={form.managerEmail} onChange={(e) => setForm({ ...form, managerEmail: e.target.value })} placeholder="manager@example.com" />
                </div>
              </div>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={submitting}>
                <Plus className="w-4 h-4 mr-2" /> Create & Generate Invite
              </Button>
            </form>

            {inviteLink && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm">
                <div className="font-semibold mb-1">Invitation Link</div>
                <div className="break-all bg-white p-2 rounded border">{inviteLink}</div>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    alert('Link copied');
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" /> Copy Link
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stores in Chain</CardTitle>
          </CardHeader>
          <CardContent>
            {stores.length === 0 ? (
              <p className="text-gray-500">No stores yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stores.map((s) => (
                  <div key={s.id} className="border rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{s.store_name}</div>
                        <div className="text-xs text-gray-500">{s.user_email}</div>
                      </div>
                      {s.is_head_store && <Badge className="bg-yellow-100 text-yellow-800">Head</Badge>}
                    </div>
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