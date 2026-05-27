import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader, X, AlertCircle, Check, Package, ChevronsUpDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "../LanguageProvider";
import { Badge } from "@/components/ui/badge";

export default function OrderForm({ order, suppliers, onSubmit, onCancel, onSaveDraft }) {
  const { t, language } = useLanguage();
  const safeT = (key, he, en) => {
    const v = t(key);
    if (language === 'he' && (v === key || !v)) return he;
    return (v === key || !v) ? (en ?? key) : v;
  };

  const [currentOrder, setCurrentOrder] = React.useState(order || {
    supplier_id: "",
    supplier_name: "",
    supplier_phone: "",
    supplier_email: "",
    restaurant_name: "",
    restaurant_address: "",
    items: [],
    notes: "",
    delivery_date: "",
    total_cost: 0
  });

  const [availableItems, setAvailableItems] = React.useState([]);
  const [loadingItems, setLoadingItems] = React.useState(false);
  const [itemQuantities, setItemQuantities] = React.useState({});
  const [currentStock, setCurrentStock] = React.useState({}); // Track current stock per item
  const [itemSearch, setItemSearch] = React.useState("");
  const [supplierOpen, setSupplierOpen] = React.useState(false);


  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        if (user.business_name && !currentOrder.restaurant_name) {
          setCurrentOrder(prev => ({
            ...prev,
            restaurant_name: user.business_name,
            restaurant_address: user.business_address || ""
          }));
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  React.useEffect(() => {
    if (currentOrder.supplier_id) {
      loadSupplierItems(currentOrder.supplier_id);
    }
  }, [currentOrder.supplier_id]);

  React.useEffect(() => {
    if (order && order.items) {
      const quantities = {};
      order.items.forEach(item => {
        quantities[item.item_id] = item.quantity;
      });
      setItemQuantities(quantities);
    }
  }, [order]);

  const loadSupplierItems = async (supplierId) => {
    setLoadingItems(true);
    try {
      const user = await base44.auth.me();
      const workingEmail = user.acting_as_store_email || user.email;
      let ownerEmail = null;

      // Prefer explicit lookup by the working (controlled) user
      try {
        const storeUserRecords = await base44.entities.StoreUser.filter({ user_email: workingEmail, is_active: true });
        if (storeUserRecords.length > 0) {
          ownerEmail = storeUserRecords[0].owner_email;
        }
      } catch (e) {
        console.log("Could not fetch store user records for working user");
      }

      // Fallback to user context flag (when actually logged in as a store user)
      if (!ownerEmail && user.store_user_owner_email) {
        ownerEmail = user.store_user_owner_email;
      }

      // Build queries to include all relevant sources and merge
      const queries = [];

      // Always include items tagged by store owner for the working (controlled) user
      queries.push(base44.entities.Item.filter({ supplier_id: supplierId, store_owner_email: workingEmail }, 'name'));

      if (ownerEmail) {
        // Controlled user is a store user → include owner's items as well
        queries.push(base44.entities.Item.filter({ supplier_id: supplierId, created_by: ownerEmail }, 'name'));
        queries.push(base44.entities.Item.filter({ supplier_id: supplierId, store_owner_email: ownerEmail }, 'name'));
      } else {
        // Detect chain head for the controlled user via ChainStore
        let headEmail = null;
        try {
          const myStores = await base44.entities.ChainStore.filter({ user_email: workingEmail });
          const myStore = myStores?.[0];
          if (myStore && !myStore.is_head_store && myStore.chain_id) {
            const heads = await base44.entities.ChainStore.filter({ chain_id: myStore.chain_id, is_head_store: true });
            headEmail = heads?.[0]?.user_email || null;
          }
        } catch {}
        if (headEmail) {
          queries.push(base44.entities.Item.filter({ supplier_id: supplierId, created_by: headEmail }, 'name'));
        }
      }

      // Always include working user's own items
      queries.push(base44.entities.Item.filter({ supplier_id: supplierId, created_by: workingEmail }, 'name'));

      // Use a mobile-safe Promise.all with per-promise fallbacks (older mobile Safari lacks allSettled)
      const safeQueries = queries.map(p => p.then(res => res).catch(() => []));
      const results = await Promise.all(safeQueries);
      // Merge arrays safely without flatMap
      const merged = [];
      for (const arr of results) {
        if (Array.isArray(arr)) {
          for (const item of arr) merged.push(item);
        }
      }
      // De-duplicate by id
      const seen = new Set();
      const deduped = [];
      for (const it of merged) {
        if (it && !seen.has(it.id)) {
          seen.add(it.id);
          deduped.push(it);
        }
      }

      setAvailableItems(deduped);
    } catch (error) {
      console.error("Error loading items:", error);
      setAvailableItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      setCurrentOrder({
        ...currentOrder,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        supplier_phone: supplier.phone || "",
        supplier_email: supplier.email || "",
        items: []
      });
      setItemQuantities({});
      setCurrentStock({});
      // Force reload items immediately on supplier change
      loadSupplierItems(supplier.id);
    }
  };

  const handleCurrentStockChange = (itemId, stock) => {
    const stockValue = parseFloat(stock) || 0;
    setCurrentStock(prev => ({
      ...prev,
      [itemId]: stockValue
    }));
    
    // Auto-calculate suggested order quantity
    const item = availableItems.find(i => i.id === itemId);
    if (item && item.minimum_stock > 0) {
      const needed = Math.max(0, item.minimum_stock - stockValue);
      // Always update the order quantity when stock changes to reflect the new need
      setItemQuantities(prev => ({
        ...prev,
        [itemId]: needed
      }));
    }
  };

  const applySuggestedQuantity = (itemId) => {
    const item = availableItems.find(i => i.id === itemId);
    const stock = currentStock[itemId] || 0;
    if (item && item.minimum_stock > 0) {
      const needed = Math.max(0, item.minimum_stock - stock);
      setItemQuantities(prev => ({
        ...prev,
        [itemId]: needed
      }));
    }
  };

  const handleQuantityChange = (itemId, quantity) => {
    const qty = parseFloat(quantity) || 0;
    setItemQuantities(prev => ({
      ...prev,
      [itemId]: qty
    }));
  };

  const calculateTotal = () => {
    let total = 0;
    Object.keys(itemQuantities).forEach(itemId => {
      const quantity = itemQuantities[itemId] || 0;
      if (quantity > 0) {
        const item = availableItems.find(i => i.id === itemId);
        if (item && item.price) {
          const itemTotal = quantity * item.price;
          const discountedTotal = item.discount ? itemTotal * (1 - item.discount / 100) : itemTotal;
          total += discountedTotal;
        }
      }
    });
    return total;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentOrder.supplier_id) {
      alert(t('supplier_and_item_required'));
      return;
    }

    const orderItems = [];
    Object.keys(itemQuantities).forEach(itemId => {
      const quantity = itemQuantities[itemId] || 0;
      if (quantity > 0) {
        const item = availableItems.find(i => i.id === itemId);
        if (item) {
          const itemTotal = quantity * (item.price || 0);
          const discountedTotal = item.discount ? itemTotal * (1 - item.discount / 100) : itemTotal;
          
          orderItems.push({
            item_id: item.id,
            item_name: item.name,
            catalog_number: item.catalog_number || "",
            quantity: quantity,
            unit: item.unit,
            price: item.price || 0,
            discount: item.discount || 0,
            total: discountedTotal
          });
        }
      }
    });

    if (orderItems.length === 0) {
      alert(t('supplier_and_item_required'));
      return;
    }

    const totalCost = calculateTotal();
    
    const selectedSupplier = suppliers.find(s => s.id === currentOrder.supplier_id);
    if (selectedSupplier && selectedSupplier.minimum_order_amount > 0) {
      if (totalCost < selectedSupplier.minimum_order_amount) {
        alert(language === 'he' ? `לא ניתן לשלוח את ההזמנה. לספק זה מוגדר מינימום להזמנה של ₪${selectedSupplier.minimum_order_amount}.` : `Cannot send order. This supplier has a minimum order amount of ₪${selectedSupplier.minimum_order_amount}.`);
        return;
      }
    }

    const orderData = {
      ...currentOrder,
      items: orderItems,
      total_cost: totalCost
    };

    onSubmit(orderData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white sm:rounded-xl sm:shadow-lg p-3 sm:p-6 mb-8 relative"
    >
      <form onSubmit={handleSubmit} className="flex flex-col space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1 sm:space-y-2 flex flex-col">
            <Label htmlFor="supplier" className="text-xs sm:text-sm">{t('supplier')} *</Label>
            <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={supplierOpen}
                  className="w-full justify-between font-normal bg-transparent border-input h-9 sm:h-10 text-xs sm:text-sm"
                  disabled={!!order}
                >
                  {currentOrder.supplier_id
                    ? suppliers?.find((supplier) => supplier.id === currentOrder.supplier_id)?.name
                    : t('select_supplier')}
                  <ChevronsUpDown className={`h-4 w-4 shrink-0 opacity-50 ${language === 'he' ? 'mr-2' : 'ml-2'}`} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align={language === 'he' ? 'end' : 'start'}>
                <Command>
                  <CommandInput placeholder={safeT('search_supplier', 'חפש ספק...', 'Search supplier...')} />
                  <CommandList>
                    <CommandEmpty>{t('no_suppliers_available') || 'אין ספקים זמינים'}</CommandEmpty>
                    <CommandGroup>
                      {suppliers && suppliers.map((supplier) => (
                        <CommandItem
                          key={supplier.id}
                          value={supplier.name}
                          onSelect={() => {
                            handleSupplierChange(supplier.id);
                            setSupplierOpen(false);
                          }}
                        >
                          <Check
                            className={`h-4 w-4 ${language === 'he' ? 'ml-2' : 'mr-2'} ${
                              currentOrder.supplier_id === supplier.id ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {supplier.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="delivery_date" className="text-xs sm:text-sm">{t('delivery_date')}</Label>
            <Input
              id="delivery_date"
              type="date"
              value={currentOrder.delivery_date}
              onChange={(e) => setCurrentOrder({...currentOrder, delivery_date: e.target.value})}
              lang={language === 'he' ? 'he-IL' : undefined}
              className="h-9 sm:h-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="restaurant_name" className="text-xs sm:text-sm">{t('business_name')} *</Label>
            <Input
              id="restaurant_name"
              value={currentOrder.restaurant_name}
              onChange={(e) => setCurrentOrder({...currentOrder, restaurant_name: e.target.value})}
              placeholder={t('business_name')}
              className="h-9 sm:h-10 text-sm"
              required
            />
          </div>

          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="restaurant_address" className="text-xs sm:text-sm">{t('business_address')}</Label>
            <Input
              id="restaurant_address"
              value={currentOrder.restaurant_address}
              onChange={(e) => setCurrentOrder({...currentOrder, restaurant_address: e.target.value})}
              placeholder={t('business_address')}
              className="h-9 sm:h-10 text-sm"
            />
          </div>
        </div>

        {currentOrder.supplier_id && (
          <div className="space-y-3">
            <div className="mt-1 sm:mt-2 w-full">
              <Input
                placeholder={safeT('search_items', 'חפש פריטים...', 'Search items...')}
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="w-full h-11 text-sm bg-gray-50 border-gray-200 rounded-xl"
              />
            </div>

            {loadingItems ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 animate-spin text-purple-600" />
                <span className="mr-2 text-gray-600">{t('loading_items')}</span>
              </div>
            ) : availableItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t('no_available_items')}
              </div>
            ) : (
              <div className="flex flex-col max-h-[70vh] overflow-y-auto -mx-3 px-3 sm:mx-0 sm:px-0 bg-white">
                {availableItems.filter(i => !itemSearch || i.name?.toLowerCase().includes(itemSearch.toLowerCase()) || i.catalog_number?.toLowerCase().includes(itemSearch.toLowerCase())).map((item) => {
                  const quantity = itemQuantities[item.id] || 0;
                  const stock = currentStock[item.id] || 0;
                  const itemTotal = quantity * (item.price || 0);
                  const discountedTotal = item.discount ? itemTotal * (1 - item.discount / 100) : itemTotal;
                  const hasMinStock = item.minimum_stock > 0;
                  const suggestedQty = hasMinStock ? Math.max(0, item.minimum_stock - stock) : 0;
                  const isLowStock = hasMinStock && stock < item.minimum_stock;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`py-3 border-b border-gray-100 last:border-0 transition-colors ${
                        quantity > 0 ? 'bg-[#f8fdfa]' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 px-1">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-gray-900 leading-tight">
                            {item.nickname || item.name} 
                            {item.nickname && <span className="text-[11px] text-gray-500 font-normal ml-1">({item.name})</span>}
                          </h4>
                          <div className="text-xs text-gray-500 mt-1">
                            {item.unit}
                            {item.price > 0 && (
                              <span className="mr-1">
                                {' | '}₪{(item.price * (1 - (item.discount || 0) / 100)).toFixed(2)}
                              </span>
                            )}
                            {item.catalog_number && <span className="mr-1 text-[#00b074]"> • {item.catalog_number}</span>}
                          </div>
                          {hasMinStock && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                {language === 'he' ? 'תקן' : 'Par'} {item.minimum_stock}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-400">{language === 'he' ? 'מלאי:' : 'Stock:'}</span>
                                <Input
                                  type="number"
                                  value={stock || ''}
                                  onChange={(e) => handleCurrentStockChange(item.id, e.target.value)}
                                  className={`w-10 h-5 text-[10px] text-center px-0 bg-gray-50 border-gray-200 ${isLowStock ? 'text-orange-600 border-orange-300 bg-orange-50' : ''}`}
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {quantity > 0 && item.price > 0 && (
                            <div className="text-sm font-bold text-gray-900 mb-1">
                              ₪{discountedTotal.toFixed(2)}
                            </div>
                          )}
                          <div className="flex items-center bg-gray-50 rounded-full border border-gray-200 shadow-sm h-9">
                            <button 
                              type="button"
                              onClick={() => handleQuantityChange(item.id, Math.max(0, quantity - 1))}
                              className="w-9 h-full flex items-center justify-center text-gray-500 hover:text-[#00b074] transition-colors"
                            >
                              <span className="text-xl font-medium leading-none -mt-0.5">-</span>
                            </button>
                            <Input
                              type="number"
                              value={quantity || ''}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              className="w-10 h-full text-center px-0 text-sm font-bold border-0 bg-transparent focus-visible:ring-0 rounded-none shadow-none"
                              placeholder="0"
                              min="0"
                              step="0.01"
                            />
                            <button 
                              type="button"
                              onClick={() => handleQuantityChange(item.id, quantity + 1)}
                              className="w-9 h-full flex items-center justify-center text-[#00b074] hover:text-[#00905e] transition-colors"
                            >
                              <span className="text-xl font-medium leading-none -mt-0.5">+</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Smart suggestion */}
                      {(hasMinStock && stock > 0 && suggestedQty > 0 && quantity !== suggestedQty) && (
                        <div className="flex items-center justify-start mt-2 px-1">
                          <button
                            type="button"
                            onClick={() => applySuggestedQuantity(item.id)}
                            className="flex items-center gap-1 text-[11px] font-medium text-[#00b074] hover:underline"
                          >
                            <Check className="w-3 h-3" />
                            {language === 'he' ? `השלם לתקן (${suggestedQty})` : `Order to par (${suggestedQty})`}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1 sm:space-y-2 mt-2 pb-32">
          <Label htmlFor="notes" className="text-xs sm:text-sm">{t('notes')}</Label>
          <Input
            id="notes"
            value={currentOrder.notes}
            onChange={(e) => setCurrentOrder({...currentOrder, notes: e.target.value})}
            placeholder={t('notes')}
            className="h-8 sm:h-10 text-sm"
          />
        </div>
        
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t px-4 py-3 pb-safe shadow-[0_-8px_15px_rgba(0,0,0,0.08)] md:sticky md:bottom-0 md:bg-transparent md:border-none md:p-0 md:shadow-none">
          <div className="flex flex-col gap-2 max-w-4xl mx-auto w-full">
            {Object.keys(itemQuantities).some(id => itemQuantities[id] > 0) && (
              <div className="flex justify-between items-center w-full mb-1 px-1">
                <span className="text-xl sm:text-2xl font-bold text-[#00b074]">
                  ₪{calculateTotal().toFixed(2)}
                </span>
                <span className="text-sm font-semibold text-gray-700">{t('total_cost') || 'סך הכל'}</span>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel} className="h-12 w-20 text-gray-500 rounded-xl md:h-10 md:w-auto">
                {safeT('cancel', 'ביטול', 'Cancel')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!currentOrder.supplier_id) { alert(t('supplier_and_item_required')); return; }
                  const orderItems = [];
                  Object.keys(itemQuantities).forEach(itemId => {
                    const quantity = itemQuantities[itemId] || 0;
                    if (quantity > 0) {
                      const item = availableItems.find(i => i.id === itemId);
                      if (item) {
                        const itemTotal = quantity * (item.price || 0);
                        const discountedTotal = item.discount ? itemTotal * (1 - item.discount / 100) : itemTotal;
                        orderItems.push({
                          item_id: item.id,
                          item_name: item.name,
                          catalog_number: item.catalog_number || "",
                          quantity: quantity,
                          unit: item.unit,
                          price: item.price || 0,
                          discount: item.discount || 0,
                          total: discountedTotal
                        });
                      }
                    }
                  });
                  if (orderItems.length === 0) { alert(t('supplier_and_item_required')); return; }
                  const totalCost = calculateTotal();
                  const orderData = { ...currentOrder, items: orderItems, total_cost: totalCost };
                  if (onSaveDraft) onSaveDraft(orderData);
                }}
                className="h-12 flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium md:h-10 md:rounded-md"
              >
                {safeT('save_draft', 'שמור טיוטה', 'Save Draft')}
              </Button>
              <Button type="submit" className="h-12 flex-[2] bg-[#00b074] hover:bg-[#00905e] text-white rounded-xl font-bold text-base md:h-10 md:rounded-md">
                {order ? t('update_order') : t('send_order')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}