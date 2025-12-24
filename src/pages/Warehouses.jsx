import React, { useState, useEffect } from "react";
import { Warehouse } from "@/entities/Warehouse";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader, Edit, MapPin, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "../components/LanguageProvider";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
    is_active: true
  });

  const loadWarehouses = async (userEmail) => {
    try {
      setLoading(true);
      const data = await Warehouse.filter({ created_by: userEmail }, "name");
      setWarehouses(data);
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
        const currentUser = await User.me();
        setUser(currentUser);
        await loadWarehouses(currentUser.email);
      } catch (error) {
        console.error("Authentication failed:", error);
        await User.login();
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
        await Warehouse.update(editingWarehouse.id, formData);
      } else {
        await Warehouse.create(formData);
      }
      setShowForm(false);
      setEditingWarehouse(null);
      setFormData({ name: "", location: "", description: "", is_active: true });
      loadWarehouses(user.email);
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
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-5 h-5 ml-2" />
            {t('add_warehouse')}
          </Button>
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ))
            ) : (
              filteredWarehouses.map((warehouse) => (
                <motion.div
                  key={warehouse.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900">{warehouse.name}</h3>
                          {warehouse.location && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              <MapPin className="w-4 h-4" />
                              {warehouse.location}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
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
                            onClick={async () => {
                              if (!confirm(`Delete warehouse "${warehouse.name}"?`)) return;
                              try {
                                await Warehouse.delete(warehouse.id);
                                setWarehouses(prev => prev.filter(w => w.id !== warehouse.id));
                              } catch (e) {
                                alert((t('error_saving') || 'Error') + ': ' + (e.message || 'Failed to delete warehouse'));
                              }
                            }}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {warehouse.description && (
                        <p className="text-sm text-gray-600">{warehouse.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <Badge variant={warehouse.is_active ? "default" : "secondary"} className="bg-indigo-100 text-indigo-800">
                          {warehouse.is_active ? t('active') : t('inactive')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {t('created_at')}: {new Date(warehouse.created_date).toLocaleDateString('he-IL')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {!loading && filteredWarehouses.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">{t('no_warehouses')}</div>
            <div className="text-gray-500">{t('create_warehouse_first')}</div>
          </div>
        )}
      </div>
    </div>
  );
}