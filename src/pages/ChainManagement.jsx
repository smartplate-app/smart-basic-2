import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Store, Crown, Loader, Trash2, Users, Eye, ArrowLeft, Pencil } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";

export default function ChainManagementPage() {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chain, setChain] = useState(null);
  const [stores, setStores] = useState([]);
  const [showCreateChain, setShowCreateChain] = useState(false);
  const [showAddStore, setShowAddStore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewingStore, setViewingStore] = useState(null);
  const [storeSuppliers, setStoreSuppliers] = useState([]);
  const [storeItems, setStoreItems] = useState([]);
  const [chainSuppliers, setChainSuppliers] = useState([]);
  const [chainItems, setChainItems] = useState([]);

  // Form states
  const [chainName, setChainName] = useState("");
  const [chainDescription, setChainDescription] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storeUserEmail, setStoreUserEmail] = useState("");
  const [editingStore, setEditingStore] = useState(null);

  const t = {
    he: {
      title: "ניהול רשת",
      noChain: "אין לך רשת עדיין",
      createChain: "צור רשת חדשה",
      chainName: "שם הרשת",
      description: "תיאור",
      create: "צור",
      cancel: "ביטול",
      stores: "סניפים ברשת",
      addStore: "הוסף סניף",
      storeName: "שם הסניף",
      storeAddress: "כתובת",
      storeManager: "אימייל מנהל הסניף",
      headStore: "סניף ראשי",
      branch: "סניף",
      save: "שמור",
      loading: "טוען...",
      yourChain: "הרשת שלך",
      youAreHead: "אתה מנהל הרשת הראשית",
      youAreBranch: "אתה מנהל סניף ברשת",
      noStores: "אין סניפים עדיין",
      delete: "מחק",
      suppliersNote: "כל הספקים והפריטים שתוסיף יהיו זמינים לכל הסניפים ברשת",
                  viewAs: "צפה כסניף",
                              switchTo: "עבור לסניף",
                              backToChain: "חזור לניהול רשת",
                              storeView: "תצוגת סניף",
                              chainSuppliersTitle: "ספקים מהרשת (משותפים)",
                              localSuppliersTitle: "ספקים מקומיים של הסניף",
                              noLocalSuppliers: "אין ספקים מקומיים לסניף זה",
                              totalItems: "פריטים",
                              switchedTo: "אתה עובד כעת כסניף",
                              switchBack: "חזור לסניף הראשי",
                              workingAs: "עובד כסניף"
                },
    en: {
      title: "Chain Management",
      noChain: "You don't have a chain yet",
      createChain: "Create New Chain",
      chainName: "Chain Name",
      description: "Description",
      create: "Create",
      cancel: "Cancel",
      stores: "Stores in Chain",
      addStore: "Add Store",
      storeName: "Store Name",
      storeAddress: "Address",
      storeManager: "Store Manager Email",
      headStore: "Head Store",
      branch: "Branch",
      save: "Save",
      loading: "Loading...",
      yourChain: "Your Chain",
      youAreHead: "You are the chain head admin",
      youAreBranch: "You manage a branch in this chain",
      noStores: "No stores yet",
      delete: "Delete",
      suppliersNote: "All suppliers and items you add will be available to all stores in the chain",
                  viewAs: "View as Store",
                              switchTo: "Switch to Store",
                              backToChain: "Back to Chain Management",
                              storeView: "Store View",
                              chainSuppliersTitle: "Chain Suppliers (Shared)",
                              localSuppliersTitle: "Store's Local Suppliers",
                              noLocalSuppliers: "No local suppliers for this store",
                              totalItems: "items",
                              switchedTo: "You are now working as branch",
                              switchBack: "Switch back to Head Store",
                              workingAs: "Working as branch"
                }
  }[language] || {};

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Check if user has a chain
      if (currentUser.chain_id) {
        const chains = await base44.entities.Chain.filter({ id: currentUser.chain_id });
        if (chains.length > 0) {
          setChain(chains[0]);
          const chainStores = await base44.entities.ChainStore.filter({ chain_id: currentUser.chain_id });
          setStores(chainStores);
        }
      } else {
        // Check if user is head of any chain
        const ownedChains = await base44.entities.Chain.filter({ head_store_user_email: currentUser.email });
        if (ownedChains.length > 0) {
          setChain(ownedChains[0]);
          const chainStores = await base44.entities.ChainStore.filter({ chain_id: ownedChains[0].id });
          setStores(chainStores);
          // Update user with chain info
          await base44.auth.updateMe({ chain_id: ownedChains[0].id, is_chain_head: true });
        }
      }
    } catch (error) {
      console.error("Error loading chain data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChain = async () => {
    if (!chainName.trim()) return;
    
    try {
      setSaving(true);
      
      // Create the chain
      const newChain = await base44.entities.Chain.create({
        name: chainName,
        head_store_user_email: user.email,
        description: chainDescription
      });

      // Create head store
      await base44.entities.ChainStore.create({
        chain_id: newChain.id,
        chain_name: chainName,
        store_name: chainName + (language === 'he' ? ' - סניף ראשי' : ' - Head Store'),
        user_email: user.email,
        is_head_store: true
      });

      // Update user
      await base44.auth.updateMe({ 
        chain_id: newChain.id, 
        is_chain_head: true 
      });

      setShowCreateChain(false);
      setChainName("");
      setChainDescription("");
      await loadData();
    } catch (error) {
      console.error("Error creating chain:", error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddStore = async () => {
        if (!storeName.trim() || !storeUserEmail.trim()) return;

        try {
          setSaving(true);

          if (editingStore) {
            // Update existing store
            await base44.entities.ChainStore.update(editingStore.id, {
              store_name: storeName,
              store_address: storeAddress,
              user_email: storeUserEmail
            });
          } else {
            // Create new store
            await base44.entities.ChainStore.create({
              chain_id: chain.id,
              chain_name: chain.name,
              store_name: storeName,
              store_address: storeAddress,
              user_email: storeUserEmail,
              is_head_store: false
            });
          }

          setShowAddStore(false);
          setEditingStore(null);
          setStoreName("");
          setStoreAddress("");
          setStoreUserEmail("");
          await loadData();
        } catch (error) {
          console.error("Error saving store:", error);
          alert(error.message);
        } finally {
          setSaving(false);
        }
      };

      const handleEditStore = (store) => {
        setEditingStore(store);
        setStoreName(store.store_name);
        setStoreAddress(store.store_address || "");
        setStoreUserEmail(store.user_email);
        setShowAddStore(true);
      };

  const handleDeleteStore = async (storeId) => {
        if (!confirm(language === 'he' ? 'למחוק סניף זה?' : 'Delete this store?')) return;

        try {
          await base44.entities.ChainStore.delete(storeId);
          await loadData();
        } catch (error) {
          console.error("Error deleting store:", error);
        }
      };

      const viewStoreAs = async (store) => {
        try {
          setLoading(true);
          setViewingStore(store);

          // Load chain suppliers (from head store) + local suppliers (created_by OR store_owner_email)
          const [headSuppliers, headItems, localSuppliersByCreatedBy, localSuppliersByStoreOwner, localItems] = await Promise.all([
            base44.entities.Supplier.filter({ created_by: chain.head_store_user_email }),
            base44.entities.Item.filter({ created_by: chain.head_store_user_email }),
            base44.entities.Supplier.filter({ created_by: store.user_email }),
            base44.entities.Supplier.filter({ store_owner_email: store.user_email }),
            base44.entities.Item.filter({ created_by: store.user_email })
          ]);

          // Combine local suppliers and remove duplicates
          const allLocalSuppliers = [...localSuppliersByCreatedBy, ...localSuppliersByStoreOwner];
          const uniqueLocalSuppliers = allLocalSuppliers.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);

          setChainSuppliers(headSuppliers);
          setChainItems(headItems);
          setStoreSuppliers(uniqueLocalSuppliers);
          setStoreItems(localItems);
        } catch (error) {
          console.error("Error loading store data:", error);
        } finally {
          setLoading(false);
        }
      };

      const exitStoreView = () => {
            setViewingStore(null);
            setStoreSuppliers([]);
            setStoreItems([]);
            setChainSuppliers([]);
            setChainItems([]);
          };

          const switchToStore = async (store) => {
            try {
              // Save the store info to user's data so all pages use it
              await base44.auth.updateMe({
                acting_as_store_id: store.id,
                acting_as_store_name: store.store_name,
                acting_as_store_email: store.user_email
              });

              // Reload the page to apply changes
              window.location.reload();
            } catch (error) {
              console.error("Error switching store:", error);
              alert(language === 'he' ? 'שגיאה במעבר לסניף' : 'Error switching to store');
            }
          };

          const switchBackToHead = async () => {
            try {
              await base44.auth.updateMe({
                acting_as_store_id: null,
                acting_as_store_name: null,
                acting_as_store_email: null
              });
              window.location.reload();
            } catch (error) {
              console.error("Error switching back:", error);
            }
          };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="w-12 h-12 animate-spin text-gray-600" />
      </div>
    );
  }

  const isChainHead = user?.is_chain_head || chain?.head_store_user_email === user?.email;
  const isActingAsStore = user?.acting_as_store_id && user?.acting_as_store_name;

  // Store View Mode
  if (viewingStore) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <Card className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardContent className="py-4">
              <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Eye className="w-8 h-8" />
                  <div className={isRTL ? 'text-right' : ''}>
                    <h2 className="text-xl font-bold">{t.storeView}: {viewingStore.store_name}</h2>
                    <p className="text-blue-100">{viewingStore.user_email}</p>
                  </div>
                </div>
                <Button onClick={exitStoreView} variant="secondary" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <ArrowLeft className="w-4 h-4" />
                  {t.backToChain}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Chain Suppliers (Shared) */}
          <Card className="mb-6">
            <CardHeader className="bg-yellow-50 border-b border-yellow-200">
              <CardTitle className={`flex items-center gap-2 text-yellow-800 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <Crown className="w-5 h-5" />
                {t.chainSuppliersTitle} ({chainSuppliers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {chainSuppliers.length === 0 ? (
                <p className={`text-gray-500 ${isRTL ? 'text-right' : ''}`}>{language === 'he' ? 'אין ספקים ברשת' : 'No chain suppliers'}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {chainSuppliers.map((supplier) => {
                    const itemCount = chainItems.filter(i => i.supplier_id === supplier.id).length;
                    return (
                      <div key={supplier.id} className="border-2 border-yellow-200 bg-yellow-50 rounded-lg p-3">
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                          <Crown className="w-4 h-4 text-yellow-600" />
                          <span className="font-semibold">{supplier.name}</span>
                        </div>
                        {supplier.phone && <p className={`text-sm text-gray-600 ${isRTL ? 'text-right' : ''}`}>📞 {supplier.phone}</p>}
                        <p className={`text-xs text-yellow-700 mt-1 ${isRTL ? 'text-right' : ''}`}>{itemCount} {t.totalItems}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Local Suppliers */}
          <Card>
            <CardHeader className="bg-blue-50 border-b border-blue-200">
              <CardTitle className={`flex items-center gap-2 text-blue-800 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <Store className="w-5 h-5" />
                {t.localSuppliersTitle} ({storeSuppliers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {storeSuppliers.length === 0 ? (
                <p className={`text-gray-500 ${isRTL ? 'text-right' : ''}`}>{t.noLocalSuppliers}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {storeSuppliers.map((supplier) => {
                    const itemCount = storeItems.filter(i => i.supplier_id === supplier.id).length;
                    return (
                      <div key={supplier.id} className="border rounded-lg p-3 bg-white">
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                          <Store className="w-4 h-4 text-blue-500" />
                          <span className="font-semibold">{supplier.name}</span>
                        </div>
                        {supplier.phone && <p className={`text-sm text-gray-600 ${isRTL ? 'text-right' : ''}`}>📞 {supplier.phone}</p>}
                        <p className={`text-xs text-blue-600 mt-1 ${isRTL ? 'text-right' : ''}`}>{itemCount} {t.totalItems}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <div className={`mt-6 p-4 bg-gray-100 rounded-lg ${isRTL ? 'text-right' : ''}`}>
            <p className="text-sm text-gray-600">
              {language === 'he' 
                ? `סה"כ הסניף רואה: ${chainSuppliers.length + storeSuppliers.length} ספקים, ${chainItems.length + storeItems.length} פריטים`
                : `Total visible to store: ${chainSuppliers.length + storeSuppliers.length} suppliers, ${chainItems.length + storeItems.length} items`
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto">
        {/* Acting as Store Banner */}
        {isActingAsStore && (
          <Card className="mb-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
            <CardContent className="py-4">
              <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Store className="w-6 h-6" />
                  <div className={isRTL ? 'text-right' : ''}>
                    <p className="font-bold">{t.workingAs}: {user.acting_as_store_name}</p>
                    <p className="text-sm text-orange-100">{user.acting_as_store_email}</p>
                  </div>
                </div>
                <Button onClick={switchBackToHead} variant="secondary" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <ArrowLeft className="w-4 h-4" />
                  {t.switchBack}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className={`flex items-center gap-3 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Building2 className="w-8 h-8 text-gray-700" />
          <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
        </div>

        {!chain ? (
          // No chain - show create option
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-6">{t.noChain}</p>
              
              <Dialog open={showCreateChain} onOpenChange={setShowCreateChain}>
                <DialogTrigger asChild>
                  <Button className="bg-gray-900 hover:bg-gray-800">
                    <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t.createChain}
                  </Button>
                </DialogTrigger>
                <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
                  <DialogHeader>
                    <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>{t.createChain}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className={isRTL ? 'text-right block' : ''}>{t.chainName}</Label>
                      <Input 
                        value={chainName} 
                        onChange={(e) => setChainName(e.target.value)}
                        className={isRTL ? 'text-right' : ''}
                      />
                    </div>
                    <div>
                      <Label className={isRTL ? 'text-right block' : ''}>{t.description}</Label>
                      <Input 
                        value={chainDescription} 
                        onChange={(e) => setChainDescription(e.target.value)}
                        className={isRTL ? 'text-right' : ''}
                      />
                    </div>
                    <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Button onClick={handleCreateChain} disabled={saving} className="bg-gray-900 hover:bg-gray-800">
                        {saving ? <Loader className="w-4 h-4 animate-spin" /> : t.create}
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreateChain(false)}>
                        {t.cancel}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          // Has chain - show management
          <div className="space-y-6">
            {/* Chain Info */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-t-lg">
                <CardTitle className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Crown className="w-6 h-6 text-yellow-400" />
                  {t.yourChain}: {chain.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className={`text-gray-600 ${isRTL ? 'text-right' : ''}`}>
                  {isChainHead ? t.youAreHead : t.youAreBranch}
                </p>
                {isChainHead && (
                  <p className={`text-sm text-green-600 mt-2 bg-green-50 p-3 rounded ${isRTL ? 'text-right' : ''}`}>
                    💡 {t.suppliersNote}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Stores List */}
            {isChainHead && (
              <Card>
                <CardHeader className={`flex flex-row items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Store className="w-5 h-5" />
                    {t.stores}
                  </CardTitle>
                  <Dialog open={showAddStore} onOpenChange={setShowAddStore}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-gray-900 hover:bg-gray-800">
                        <Plus className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                        {t.addStore}
                      </Button>
                    </DialogTrigger>
                    <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
                      <DialogHeader>
                        <DialogTitle className={isRTL ? 'text-right' : ''}>{t.addStore}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label className={isRTL ? 'text-right block' : ''}>{t.storeName}</Label>
                          <Input 
                            value={storeName} 
                            onChange={(e) => setStoreName(e.target.value)}
                            className={isRTL ? 'text-right' : ''}
                          />
                        </div>
                        <div>
                          <Label className={isRTL ? 'text-right block' : ''}>{t.storeAddress}</Label>
                          <Input 
                            value={storeAddress} 
                            onChange={(e) => setStoreAddress(e.target.value)}
                            className={isRTL ? 'text-right' : ''}
                          />
                        </div>
                        <div>
                          <Label className={isRTL ? 'text-right block' : ''}>{t.storeManager}</Label>
                          <Input 
                            type="email"
                            value={storeUserEmail} 
                            onChange={(e) => setStoreUserEmail(e.target.value)}
                            placeholder="user@example.com"
                            className={isRTL ? 'text-right' : ''}
                          />
                        </div>
                        <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Button onClick={handleAddStore} disabled={saving} className="bg-gray-900 hover:bg-gray-800">
                            {saving ? <Loader className="w-4 h-4 animate-spin" /> : t.save}
                          </Button>
                          <Button variant="outline" onClick={() => setShowAddStore(false)}>
                            {t.cancel}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {stores.length === 0 ? (
                    <p className={`text-gray-500 text-center py-4 ${isRTL ? 'text-right' : ''}`}>{t.noStores}</p>
                  ) : (
                    <div className="space-y-3">
                      {stores.map((store) => (
                        <div 
                          key={store.id} 
                          className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <div className={isRTL ? 'text-right' : ''}>
                            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              {store.is_head_store ? (
                                <Crown className="w-4 h-4 text-yellow-500" />
                              ) : (
                                <Store className="w-4 h-4 text-gray-500" />
                              )}
                              <span className="font-semibold">{store.store_name}</span>
                              <span className={`text-xs px-2 py-1 rounded ${store.is_head_store ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-600'}`}>
                                {store.is_head_store ? t.headStore : t.branch}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{store.user_email}</p>
                            {store.store_address && (
                              <p className="text-sm text-gray-400">{store.store_address}</p>
                            )}
                          </div>
                          {!store.is_head_store && (
                                                            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                              <Button 
                                                                                                    variant="default" 
                                                                                                    size="sm"
                                                                                                    onClick={() => switchToStore(store)}
                                                                                                    className="bg-orange-500 hover:bg-orange-600 text-white"
                                                                                                  >
                                                                                                    <Store className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                                                                                    {t.switchTo}
                                                                                                  </Button>
                                                                                                  <Button 
                                                                                                    variant="outline" 
                                                                                                    size="sm"
                                                                                                    onClick={() => viewStoreAs(store)}
                                                                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                                                  >
                                                                                                    <Eye className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                                                                                    {t.viewAs}
                                                                                                  </Button>
                                                              <Button 
                                                                variant="ghost" 
                                                                size="icon"
                                                                onClick={() => handleDeleteStore(store.id)}
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                              >
                                                                <Trash2 className="w-4 h-4" />
                                                              </Button>
                                                            </div>
                                                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}