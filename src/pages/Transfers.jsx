import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader, CheckCircle2 } from "lucide-react";
import TransferForm from "../components/transfers/TransferForm";

export default function Transfers() {
  const [user, setUser] = useState(null);
  const [stores, setStores] = useState([]);
  const [chainId, setChainId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);

  const myStoreEmail = useMemo(() => {
    if (!user) return null;
    return user.store_user_owner_email || user.email;
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const u = await base44.auth.me();
      setUser(u);

      // Determine chain id
      let cid = u.chain_id;
      if (!cid) {
        try {
          const myStores = await base44.entities.ChainStore.filter({ user_email: u.email });
          if (myStores?.length) cid = myStores[0].chain_id;
        } catch {}
      }
      setChainId(cid || null);

      // Load chain stores
      if (cid) {
        const cs = await base44.entities.ChainStore.filter({ chain_id: cid });
        setStores(cs || []);
      }

      // Load transfers
      const [inc, out] = await Promise.all([
        base44.entities.InventoryTransfer.filter({ to_store_email: u.store_user_owner_email || u.email }, "-transfer_date"),
        base44.entities.InventoryTransfer.filter({ from_store_email: u.store_user_owner_email || u.email }, "-transfer_date"),
      ]);
      setIncoming(inc || []);
      setOutgoing(out || []);

      setLoading(false);
    };
    load();
  }, []);

  const refreshTransfers = async () => {
    if (!myStoreEmail) return;
    const [inc, out] = await Promise.all([
      base44.entities.InventoryTransfer.filter({ to_store_email: myStoreEmail }, "-transfer_date"),
      base44.entities.InventoryTransfer.filter({ from_store_email: myStoreEmail }, "-transfer_date"),
    ]);
    setIncoming(inc || []);
    setOutgoing(out || []);
  };

  const storeNameByEmail = (email) => {
    const s = (stores || []).find(x => x.user_email === email);
    return s?.store_name || email;
  };

  const handleCreate = async (data) => {
    if (!user) return;
    setSaving(true);
    try {
      const fromStore = (stores || []).find(s => s.user_email === myStoreEmail);
      await base44.entities.InventoryTransfer.create({
        ...data,
        status: "sent",
        from_store_email: myStoreEmail,
        from_store_name: fromStore?.store_name || user.business_name || user.full_name || myStoreEmail,
      });
      setShowForm(false);
      await refreshTransfers();
    } finally {
      setSaving(false);
    }
  };

  const markReceived = async (t) => {
    await base44.entities.InventoryTransfer.update(t.id, { status: "received" });
    await refreshTransfers();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="w-8 h-8 animate-spin text-gray-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Branch Transfers</h1>
          <Button className="bg-gray-900 hover:bg-gray-800" onClick={() => setShowForm(s => !s)}>
            <Plus className="w-4 h-4 mr-2" /> New Transfer
          </Button>
        </div>

        {showForm && (
          <TransferForm
            stores={stores}
            currentStoreEmail={myStoreEmail}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        )}

        <Tabs defaultValue="incoming">
          <TabsList>
            <TabsTrigger value="incoming">Incoming ({incoming.length})</TabsTrigger>
            <TabsTrigger value="outgoing">Outgoing ({outgoing.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="incoming">
            <div className="grid gap-3">
              {incoming.length === 0 ? (
                <Card><CardContent className="p-6 text-gray-500">No incoming transfers</CardContent></Card>
              ) : incoming.map(t => (
                <Card key={t.id} className="bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{new Date(t.transfer_date).toLocaleDateString()} · From {storeNameByEmail(t.from_store_email)}</span>
                      <span className={`text-sm px-2 py-1 rounded ${t.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.status}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm text-gray-600">Total value: {t.total_value?.toFixed ? t.total_value.toFixed(2) : Number(t.total_value || 0).toFixed(2)}</div>
                    <div className="border rounded">
                      <div className="grid grid-cols-12 text-xs font-semibold bg-gray-50 p-2">
                        <div className="col-span-6">Item</div>
                        <div className="col-span-2 text-right">Qty</div>
                        <div className="col-span-2 text-right">Unit</div>
                        <div className="col-span-2 text-right">Value</div>
                      </div>
                      {(t.items || []).map((i, idx) => (
                        <div key={idx} className="grid grid-cols-12 text-sm p-2 border-t">
                          <div className="col-span-6">{i.item_name}</div>
                          <div className="col-span-2 text-right">{i.quantity}</div>
                          <div className="col-span-2 text-right">{i.unit}</div>
                          <div className="col-span-2 text-right">{(Number(i.total_value ?? (Number(i.quantity||0)*Number(i.unit_price||0))) ).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                    {t.status !== 'received' && (
                      <div className="text-right">
                        <Button onClick={() => markReceived(t)} className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Received
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="outgoing">
            <div className="grid gap-3">
              {outgoing.length === 0 ? (
                <Card><CardContent className="p-6 text-gray-500">No outgoing transfers</CardContent></Card>
              ) : outgoing.map(t => (
                <Card key={t.id} className="bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{new Date(t.transfer_date).toLocaleDateString()} · To {storeNameByEmail(t.to_store_email)}</span>
                      <span className={`text-sm px-2 py-1 rounded ${t.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.status}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm text-gray-600">Total value: {t.total_value?.toFixed ? t.total_value.toFixed(2) : Number(t.total_value || 0).toFixed(2)}</div>
                    <div className="border rounded">
                      <div className="grid grid-cols-12 text-xs font-semibold bg-gray-50 p-2">
                        <div className="col-span-6">Item</div>
                        <div className="col-span-2 text-right">Qty</div>
                        <div className="col-span-2 text-right">Unit</div>
                        <div className="col-span-2 text-right">Value</div>
                      </div>
                      {(t.items || []).map((i, idx) => (
                        <div key={idx} className="grid grid-cols-12 text-sm p-2 border-t">
                          <div className="col-span-6">{i.item_name}</div>
                          <div className="col-span-2 text-right">{i.quantity}</div>
                          <div className="col-span-2 text-right">{i.unit}</div>
                          <div className="col-span-2 text-right">{(Number(i.total_value ?? (Number(i.quantity||0)*Number(i.unit_price||0))) ).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}