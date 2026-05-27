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
            <div className="flex items-center justify-between gap-2 mt-1 sm:mt-2">
              <Label className="text-sm sm:text-lg font-semibold whitespace-nowrap">{t('items')}</Label>
              <Input
                placeholder={safeT('search_items', 'חפש פריטים...', 'Search items...')}
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="max-w-[180px] sm:max-w-xs h-8 sm:h-10 text-xs sm:text-sm"
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
              <div className="grid grid-cols-1 gap-2 max-h-[65vh] overflow-y-auto border rounded-lg p-2 sm:p-4 bg-gray-50">
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
                      className={`p-2 sm:p-3 rounded-lg border transition-all ${
                        quantity > 0 
                          ? 'bg-purple-50 border-purple-300 shadow-sm' 
                          : isLowStock 
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-sm leading-tight text-gray-900 truncate">
                              {item.nickname || item.name} 
                              {item.nickname && <span className="text-[10px] text-gray-500 font-normal ml-1">({item.name})</span>}
                            </span>
                          </div>
                          <div className="text-[11px] sm:text-xs text-gray-500 leading-tight mt-0.5 truncate">
                            {item.unit}
                            {item.price > 0 && (
                              <span className="mr-1">
                                {' • '}₪{item.price.toFixed(2)}
                                {item.discount > 0 && <span className="text-green-600"> (-{item.discount}%)</span>}
                              </span>
                            )}
                            {item.catalog_number && <span className="mr-1"> • {item.catalog_number}</span>}
                          </div>
                          {hasMinStock && (
                            <div className="mt-1">
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                {language === 'he' ? 'מינימום:' : 'Min:'} {item.minimum_stock}
                              </Badge>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          {hasMinStock && (
                            <div className="flex flex-col items-center w-12 sm:w-16">
                              <Label className="text-[10px] text-gray-400 mb-0.5 whitespace-nowrap">
                                {language === 'he' ? 'במלאי' : 'Stock'}
                              </Label>
                              <Input
                                type="number"
                                value={stock || ''}
                                onChange={(e) => handleCurrentStockChange(item.id, e.target.value)}
                                className={`h-7 sm:h-8 text-center px-1 text-sm ${isLowStock ? 'border-orange-400 bg-orange-50' : ''}`}
                                placeholder="0"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          )}
                          
                          <div className="flex flex-col items-center w-14 sm:w-16">
                            <Label className="text-[10px] text-gray-400 mb-0.5 whitespace-nowrap">
                              {language === 'he' ? 'להזמנה' : 'Order'}
                            </Label>
                            <Input
                              type="number"
                              value={quantity || ''}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              className="h-7 sm:h-8 text-center px-1 text-sm font-medium"
                              placeholder="0"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          
                          {quantity > 0 && item.price > 0 && (
                            <div className="text-[11px] sm:text-xs font-semibold text-purple-700 text-center w-12 sm:w-14">
                              ₪{discountedTotal.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Smart suggestion */}
                      {(hasMinStock && stock > 0 && suggestedQty > 0 && quantity !== suggestedQty) || (hasMinStock && isLowStock && stock > 0) ? (
                        <div className="flex items-center justify-end gap-2 mt-1.5">
                          {hasMinStock && isLowStock && stock > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-orange-600">
                              <AlertCircle className="w-3 h-3" />
                              {language === 'he' ? `חסרים ${suggestedQty}` : `Need ${suggestedQty}`}
                            </div>
                          )}
                          {hasMinStock && stock > 0 && suggestedQty > 0 && quantity !== suggestedQty && (
                            <button
                              type="button"
                              onClick={() => applySuggestedQuantity(item.id)}
                              className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded hover:bg-green-200 transition-colors"
                            >
                              <Check className="w-2.5 h-2.5" />
                              {language === 'he' ? `הזמן ${suggestedQty}` : `Order ${suggestedQty}`}
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1 sm:space-y-2 mt-2">
          <Label htmlFor="notes" className="text-xs sm:text-sm">{t('notes')}</Label>
          <Input
            id="notes"
            value={currentOrder.notes}
            onChange={(e) => setCurrentOrder({...currentOrder, notes: e.target.value})}
            placeholder={t('notes')}
            className="h-8 sm:h-10 text-sm"
          />
        </div>
        
        <div className="sticky bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur py-3 border-t flex flex-wrap gap-2 justify-end -mx-3 sm:-mx-6 px-3 sm:px-6 mt-auto shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
          {Object.keys(itemQuantities).some(id => itemQuantities[id] > 0) && (
            <div className="w-full flex justify-between items-center bg-gradient-to-r from-purple-50 to-blue-50 p-2 sm:p-3 rounded-lg border border-purple-200 mb-2">
              <span className="text-sm sm:text-base font-semibold text-gray-700">{t('total_cost')}:</span>
              <span className="text-lg sm:text-xl font-bold text-purple-700">
                ₪{calculateTotal().toFixed(2)}
              </span>
            </div>
          )}
          
          <Button type="button" variant="outline" onClick={onCancel} className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm flex-1 sm:flex-none">
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
            className="bg-yellow-500 hover:bg-yellow-600 text-white h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm flex-1 sm:flex-none"
          >
            {safeT('save_draft', 'שמור טיוטה', 'Save Draft')}
          </Button>
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white h-9 sm:h-10 px-3 sm:px-6 text-xs sm:text-sm flex-1 sm:flex-none font-semibold">
            {order ? t('update_order') : t('send_order')}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}