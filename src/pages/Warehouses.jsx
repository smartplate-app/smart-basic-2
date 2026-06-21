import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

import { Button } from "@/components/ui/button";
import { Plus, Search, Loader, Edit, MapPin, Trash2, Package, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "../components/LanguageProvider";
import { getCache, setCache, isStale } from "../components/utils/cache";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [viewMode, setViewMode] = useState("cards"); // 'cards' or 'list'
  const { t, language } = useLanguage();
  const [isViewer, setIsViewer] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
    is_active: true
  });

  // Hydrate from cache for instant UI
  useEffect(() => {
    const c = getCache('warehouses_v1');
    if (c?.data) {
      setWarehouses(c.data.warehouses || []);
      setLoading(false);
    }
  }, []);

  const loadWarehouses = async (targetEmail, currentUser, isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      let data = [];
      if (currentUser?.admin_original_email && currentUser?.acting_as_user_email) {
        const emailsToFetch = [targetEmail];
        const whPromises = emailsToFetch.flatMap(email => [
            base44.entities.Warehouse.filter({ created_by: email }, "name", 10000),
            base44.entities.Warehouse.filter({ store_owner_email: email }, "name", 10000)
        ]);
        const allWh = (await Promise.all(whPromises)).flat();
        data = Array.from(new Map(allWh.map(item => [item.id, item])).values());
      } else {
        // Check if user is a store user - use service-role to bypass RLS
        const storeOwnerEmail = currentUser?.store_user_owner_email || currentUser?.acting_as_store_email || null;
        if (storeOwnerEmail) {
          const { data: mgData } = await base44.functions.invoke('getManagerData', { ownerEmail: storeOwnerEmail, entities: ['warehouses'] });
          data = mgData?.data?.warehouses || [];
        } else {
          const [byCreator, byOwner] = await Promise.all([
            base44.entities.Warehouse.filter({ created_by: targetEmail }, "name", 10000),
            base44.entities.Warehouse.filter({ store_owner_email: targetEmail }, "name", 10000)
          ]);
          const merged = [...byCreator, ...byOwner];
          data = merged.filter((w, i, self) => i === self.findIndex((t) => t.id === w.id));
        }
      }
      setWarehouses(data);
      setCache('warehouses_v1', { warehouses: data });
    } catch (error) {
      console.error("Error loading warehouses:", error);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        setAuthLoading(true);
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsViewer(currentUser.store_user_role === 'viewer' || currentUser.store_user_read_only === true);
        
        const targetEmail = currentUser.acting_as_store_email || currentUser.acting_as_user_email || currentUser.store_user_owner_email || currentUser.email;
        
        const c = getCache('warehouses_v1');
        const stale = isStale(c, 180000);
        const isImpersonating = currentUser?.acting_as_user_email || currentUser?.acting_as_store_email;
        if (stale || isImpersonating) {
          await loadWarehouses(targetEmail, currentUser, !!c?.data);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Authentication failed:", error);
        await base44.auth.redirectToLogin();
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert(t('warehouse_name') + ' ' + t('required_fields'));
      return;
    }

    try {
      if (editingWarehouse) {
        await base44.entities.Warehouse.update(editingWarehouse.id, formData);
      } else {
        const targetEmail = user?.acting_as_store_email || user?.acting_as_user_email || user?.store_user_owner_email || user?.email;
        await base44.entities.Warehouse.create({ ...formData, created_by: targetEmail, store_owner_email: targetEmail });
      }
      setShowForm(false);
      setEditingWarehouse(null);
      setFormData({ name: "", location: "", description: "", is_active: true });
      const targetEmail = user?.acting_as_store_email || user?.acting_as_user_email || user?.store_user_owner_email || user?.email;
      loadWarehouses(targetEmail, user);
    } catch (error) {
      console.error("Error saving warehouse:", error);
      alert(t('error_saving'));
    }
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData(warehouse);
    setShowForm(true);
  };

  const handleDelete = async (warehouse) => {
    if (!confirm(`Delete warehouse "${warehouse.name}"?`)) return;
    try {
      await base44.entities.Warehouse.delete(warehouse.id);
      setWarehouses(prev => prev.filter(w => w.id !== warehouse.id));
    } catch (e) {
      alert((t('error_saving') || 'Error') + ': ' + (e.message || 'Failed to delete warehouse'));
    }
  };

  const filteredWarehouses = warehouses.filter(warehouse =>
    warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (warehouse.location && warehouse.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-indigo-600" />
          <p className="text-lg text-gray-700">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-4 md:p-8">
      <div className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('warehouse_management')}</h1>
            <p className="text-gray-600 mt-2">{t('manage_warehouses')}</p>
          </div>
          
          <div className="flex gap-2 sm:gap-3 items-center w-full md:w-auto">
            <div className="flex bg-white rounded-lg shadow-sm border shrink-0">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('cards')}
                className={viewMode === 'cards' ? 'bg-[#d4a373] hover:bg-[#b88c60] text-white h-9 w-9' : 'text-gray-600 hover:bg-gray-100 h-9 w-9'}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-[#d4a373] hover:bg-[#b88c60] text-white h-9 w-9' : 'text-gray-600 hover:bg-gray-100 h-9 w-9'}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            
            {!isViewer && (
              <Button
                onClick={() => setShowForm(!showForm)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 h-9 px-2 sm:px-4"
              >
                <Plus className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                <span className="hidden sm:inline">{t('add_warehouse')}</span>
                <span className="sm:hidden text-sm">{language === 'he' ? 'חדש' : 'New'}</span>
              </Button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8"
            >
              <Card className="shadow-lg border-0">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <CardTitle className="text-xl font-bold">
                    {editingWarehouse ? t('edit') + ' ' + t('warehouse') : t('add_warehouse')}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      setShowForm(false);
                      setEditingWarehouse(null);
                      setFormData({ name: "", location: "", description: "", is_active: true });
                    }}
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('warehouse_name')} *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder={t('warehouse_name')}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">{t('location')}</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder={t('location')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">{t('description')}</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder={t('description')}
                        className="h-20"
                      />
                    </div>

                    <div className="flex gap-3 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForm(false);
                          setEditingWarehouse(null);
                          setFormData({ name: "", location: "", description: "", is_active: true });
                        }}
                      >
                        {t('cancel')}
                      </Button>
                      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                        {editingWarehouse ? t('update') : t('save')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder={t('search') + ' ' + t('warehouse')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredWarehouses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">{t('no_warehouses')}</div>
            <div className="text-gray-500">{t('create_warehouse_first')}</div>
          </div>
        ) : (
          viewMode === 'cards' ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {filteredWarehouses.map((warehouse) => (
                  <motion.div
                    key={warehouse.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-gray-900 mb-1 truncate" title={warehouse.name}>{warehouse.name}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-100 font-medium">
                                <Package className="w-3 h-3 mr-1" />
                                {warehouse.catalog_items?.length || 0} {t('items')}
                              </Badge>
                            </div>
                            {warehouse.location && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1 truncate" title={warehouse.location}>
                                <MapPin className="w-4 h-4 shrink-0" />
                                <span className="truncate">{warehouse.location}</span>
                              </div>
                            )}
                          </div>
                          {!isViewer && (
                            <div className="flex gap-1 shrink-0">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEdit(warehouse)}
                                className="text-gray-400 hover:text-indigo-600"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(warehouse)}
                                className="text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {warehouse.description && (
                          <p className="text-sm text-gray-600 line-clamp-2" title={warehouse.description}>{warehouse.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <Badge variant={warehouse.is_active ? "default" : "secondary"} className={warehouse.is_active ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200" : ""}>
                            {warehouse.is_active ? t('active') : t('inactive')}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {t('created_at')}: {new Date(warehouse.created_date).toLocaleDateString('he-IL')}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                      <th scope="col" className="px-6 py-3">{t('warehouse_name')}</th>
                      <th scope="col" className="px-6 py-3">{t('items')}</th>
                      <th scope="col" className="px-6 py-3">{t('location')}</th>
                      <th scope="col" className="px-6 py-3">{t('status') || (language === 'he' ? 'סטטוס' : 'Status')}</th>
                      <th scope="col" className="px-6 py-3">{t('created_at')}</th>
                      {!isViewer && <th scope="col" className="px-6 py-3 w-[100px] text-center">{language === 'he' ? 'פעולות' : 'Actions'}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWarehouses.map((warehouse, index) => (
                      <tr key={warehouse.id} className={`bg-white border-b hover:bg-gray-50 transition-colors ${index === filteredWarehouses.length - 1 ? 'border-b-0' : ''}`}>
                        <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-[200px]" title={warehouse.name}>
                          {warehouse.name}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 font-medium">
                            <Package className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                            {warehouse.catalog_items?.length || 0}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 truncate max-w-[200px]" title={warehouse.location}>
                          {warehouse.location ? (
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{warehouse.location}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={warehouse.is_active ? "default" : "secondary"} className={warehouse.is_active ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200" : ""}>
                            {warehouse.is_active ? t('active') : t('inactive')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          {new Date(warehouse.created_date).toLocaleDateString('he-IL')}
                        </td>
                        {!isViewer && (
                          <td className="px-6 py-4">
                            <div className="flex justify-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEdit(warehouse)}
                                className="h-8 w-8 text-gray-400 hover:text-indigo-600"
                                title={t('edit')}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(warehouse)}
                                className="h-8 w-8 text-gray-400 hover:text-red-600"
                                title={t('delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}