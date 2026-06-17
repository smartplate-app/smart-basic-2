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

export default function OrderForm({ order, suppliers, onSubmit, onCancel, onSaveDraft, externalItems, defaultRestaurantName }) {
  const { t, language } = useLanguage();
  const safeT = (key, he, en) => {
    const v = t(key);
    if (language === 'he' && (v === key || !v)) return he;
    return (v === key || !v) ? (en ?? key) : v;
  };

  const getUnitLabel = (u) => {
    if (!u) return '';
    if (language !== 'he') return u;
    const map = { unit: 'יחידה', liter: 'ליטר', kg: 'ק״ג', case: 'ארגז', gram: 'גרם', ml: 'מ״ל' };
    return map[u] || u;
  };

  const [currentOrder, setCurrentOrder] = React.useState(order || {
    supplier_id: "",
    supplier_name: "",
    supplier_phone: "",
    supplier_email: "",
    restaurant_name: defaultRestaurantName || "",
    restaurant_address: "",
    business_tax_id: "",
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
  const [cartPreviewOpen, setCartPreviewOpen] = React.useState(false);
  const [showScrollTop, setShowScrollTop] = React.useState(false);
  const itemsContainerRef = React.useRef(null);

  React.useEffect(() => {
    const handleWindowScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleWindowScroll);
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, []);

  React.useEffect(() => {
    // Skip auth call if external items provided (worker portal context)
    if (externalItems) return;
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        if (user.business_name && !currentOrder.restaurant_name) {
          setCurrentOrder(prev => ({
            ...prev,
            restaurant_name: user.business_name,
            restaurant_address: user.business_address || "",
            business_tax_id: user.business_tax_id || ""
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
    // If external items are provided (e.g. worker portal), filter them locally — no auth needed
    if (externalItems && externalItems.length > 0) {
      const filtered = externalItems.filter(i => i.supplier_id === supplierId);
      setAvailableItems(filtered);
      return;
    }
    setLoadingItems(true);
    try {
      const user = await base44.auth.me();
      const workingEmail = user.acting_as_store_email || user.email;
      let ownerEmail = null;

      // If the user is a manager acting as a store, the acting_as_store_email IS the owner
      if (user.acting_as_store_email) {
        ownerEmail = user.acting_as_store_email;
      }

      // Prefer explicit lookup by the working (controlled) user
      if (!ownerEmail) {
        try {
          const storeUserRecords = await base44.entities.StoreUser.filter({ user_email: workingEmail, is_active: true });
          if (storeUserRecords.length > 0) {
            ownerEmail = storeUserRecords[0].owner_email;
          }
        } catch (e) {
          console.log("Could not fetch store user records for working user");
        }
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
    
    if (!currentOrder.restaurant_name) {
      alert(safeT('business_name_required', 'שם העסק חובה', 'Business name is required'));
      return;
    }

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

    const orderData = {
      ...currentOrder,
      items: orderItems,
      total_cost: totalCost
    };

    onSubmit(orderData);
  };

  // Filter to show only items with quantity > 0 in cart preview
  const cartItems = React.useMemo(() => {
    return availableItems.filter(item => (itemQuantities[item.id] || 0) > 0);
  }, [availableItems, itemQuantities]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white sm:rounded-xl sm:shadow-lg p-3 sm:p-6 mb-8 relative"
    >
      <form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} className="flex flex-col space-y-3 sm:space-y-4 w-full box-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1 sm:space-y-2 flex flex-col">
            <Label htmlFor="supplier" className="text-xs sm:text-sm">{t('supplier')} *</Label>
            <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={supplierOpen}
                  className="w-full justify-between text-black h-14 text-lg bg-white border-2 border-gray-200 hover:border-[#d4a373] hover:bg-gray-50 transition-colors rounded-xl shadow-sm"
                  disabled={!!order}
                >
                  <span className="truncate font-bold text-gray-800">
                    {currentOrder.supplier_id
                      ? suppliers?.find((supplier) => supplier.id === currentOrder.supplier_id)?.name
                      : t('select_supplier')}
                  </span>
                  <ChevronsUpDown className={`h-5 w-5 shrink-0 opacity-50 text-gray-500 ${language === 'he' ? 'mr-2' : 'ml-2'}`} />
                </Button>
              </PopoverTrigger>
              <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()} onTouchMove={(e) => e.stopPropagation()} className="w-[--radix-popover-trigger-width] p-0 rounded-xl shadow-2xl border border-gray-200 overflow-hidden" align={language === 'he' ? 'end' : 'start'} style={{ zIndex: 10001 }}>
                <Command className="w-full flex flex-col" onTouchMove={(e) => e.stopPropagation()}>
                  <CommandInput autoFocus={false} style={{ fontSize: '16px' }} className="h-12 text-base px-3 border-none outline-none focus:ring-0" placeholder={safeT('search_supplier', 'חפש ספק...', 'Search supplier...')} />
                  <div className="h-px bg-gray-100 w-full shrink-0" />
                  <CommandList className="h-[250px] sm:h-[300px] w-full overflow-y-auto p-1.5 block touch-pan-y" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }} onTouchMove={(e) => e.stopPropagation()}>
                    <CommandEmpty className="py-6 text-center text-sm text-gray-500">{t('no_suppliers_available') || 'אין ספקים זמינים'}</CommandEmpty>
                    <CommandGroup>
                      {suppliers && suppliers.map((supplier) => (
                        <CommandItem
                          key={supplier.id}
                          value={supplier.name}
                          className="py-3.5 px-3 my-0.5 rounded-lg text-base font-semibold cursor-pointer aria-selected:bg-[#d4a373]/15 aria-selected:text-[#b88c60]"
                          onSelect={() => {
                            handleSupplierChange(supplier.id);
                            setSupplierOpen(false);
                          }}
                        >
                          <Check
                            className={`h-5 w-5 text-[#d4a373] ${language === 'he' ? 'ml-3' : 'mr-3'} ${
                              currentOrder.supplier_id === supplier.id ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          <span className="truncate">{supplier.name}</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="restaurant_name" className="text-xs sm:text-sm">{t('business_name')} *</Label>
            <Input
              id="restaurant_name"
              value={currentOrder.restaurant_name}
              onChange={(e) => setCurrentOrder({...currentOrder, restaurant_name: e.target.value})}
              placeholder={t('business_name')}
              className="h-9 sm:h-10 text-base sm:text-sm"
            />
          </div>

          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="restaurant_address" className="text-xs sm:text-sm">{t('business_address')}</Label>
            <Input
              id="restaurant_address"
              value={currentOrder.restaurant_address}
              onChange={(e) => setCurrentOrder({...currentOrder, restaurant_address: e.target.value})}
              placeholder={t('business_address')}
              className="h-9 sm:h-10 text-base sm:text-sm"
            />
          </div>

          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="business_tax_id" className="text-xs sm:text-sm">{language === 'he' ? 'ח.פ/עוסק מורשה' : 'Business ID / VAT'}</Label>
            <Input
              id="business_tax_id"
              value={currentOrder.business_tax_id || ""}
              onChange={(e) => setCurrentOrder({...currentOrder, business_tax_id: e.target.value})}
              placeholder={language === 'he' ? 'ח.פ / מס׳ עוסק' : 'Tax ID'}
              className="h-9 sm:h-10 text-base sm:text-sm"
            />
          </div>
        </div>

        {currentOrder.supplier_id && (
          <div className="space-y-3">
            <div className="mt-1 sm:mt-2 w-full sticky top-0 z-20 bg-white/95 backdrop-blur py-2">
              <Input
                placeholder={safeT('search_items', 'חפש פריטים...', 'Search items...')}
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="w-full h-11 text-base sm:text-sm bg-gray-50 border-gray-200 rounded-xl"
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
              <div className="relative">
                <div 
                  ref={itemsContainerRef}
                  className="flex flex-col bg-transparent gap-1.5 pb-6 pt-1 w-full box-border"
                >
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
                      className={`p-1.5 border rounded-xl transition-colors ${
                        quantity > 0 
                          ? 'bg-white border-[#d8b4fe] shadow-sm' 
                          : isLowStock 
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-white border-gray-200 hover:border-[#e9d5ff]'
                      }`}
                    >
                      <div className="flex flex-row items-center justify-between gap-2 px-1">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-gray-900 leading-tight truncate">
                            {item.nickname || item.name} 
                            {item.nickname && <span className="text-[11px] text-gray-500 font-normal ml-1">({item.name})</span>}
                          </h4>
                          <div className="text-[11px] text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-1">
                            <span>{getUnitLabel(item.unit)}</span>
                            {item.price > 0 && (
                              <span>
                                {' • '}₪{item.price.toFixed(2)}
                              </span>
                            )}
                            {item.catalog_number && <span className="text-gray-500">{' • '}{language === 'he' ? 'מקט' : 'Cat No'}: {item.catalog_number}</span>}
                          </div>
                        </div>
                        
                        <div className="flex flex-row items-center justify-end gap-3 shrink-0">
                          {quantity > 0 && item.price > 0 ? (
                            <div className="text-sm font-bold text-[#8b5cf6] hidden sm:block min-w-[3.5rem] rtl:text-right ltr:text-left">
                              ₪{discountedTotal.toFixed(2)}
                            </div>
                          ) : (
                            <div className="hidden sm:block min-w-[3.5rem]"></div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-center">
                              <Label className="text-[10px] text-gray-500 mb-0.5">{language === 'he' ? 'להזמנה' : 'Order'}</Label>
                              <div className="flex items-center bg-white rounded-md border border-gray-300 h-8 w-16">
                                <Input
                                  type="number"
                                  value={quantity || ''}
                                  onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                  className="flex-1 h-full text-center px-0 text-base font-medium border-0 bg-transparent focus-visible:ring-0 rounded-none shadow-none"
                                  placeholder="0"
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                            </div>
                            
                            {hasMinStock && (
                              <div className="flex flex-col items-center">
                                <Label className="text-[10px] text-gray-500 mb-0.5">{language === 'he' ? 'מלאי' : 'Stock'}</Label>
                                <Input
                                  type="number"
                                  value={stock || ''}
                                  onChange={(e) => handleCurrentStockChange(item.id, e.target.value)}
                                  className={`w-12 h-7 text-base sm:text-sm text-center px-0 rounded-md border ${isLowStock ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-300'}`}
                                  placeholder="0"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Smart suggestion */}
                      {(hasMinStock && stock > 0 && suggestedQty > 0 && quantity !== suggestedQty) && (
                        <div className="flex items-center justify-start mt-1 px-0.5">
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
                {availableItems.filter(i => !itemSearch || i.name?.toLowerCase().includes(itemSearch.toLowerCase()) || i.catalog_number?.toLowerCase().includes(itemSearch.toLowerCase())).length > 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-400 mt-2 border-t border-gray-100">
                    <Check className="w-8 h-8 text-gray-300 mb-2 opacity-50" />
                    <p className="text-sm">{language === 'he' ? 'הגעת לסוף רשימת הפריטים' : 'End of items list'}</p>
                  </div>
                )}
                {showScrollTop && (
                  <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-28 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-gray-200 text-gray-700 p-3 rounded-full hover:bg-gray-50 transition-all z-40"
                    style={{ [language === 'he' ? 'left' : 'right']: '20px' }}
                    title={language === 'he' ? 'חזור למעלה' : 'Scroll to top'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1 sm:space-y-2 mt-2 pb-40">
          <Label htmlFor="notes" className="text-xs sm:text-sm">{t('notes')}</Label>
          <Input
            id="notes"
            value={currentOrder.notes}
            onChange={(e) => setCurrentOrder({...currentOrder, notes: e.target.value})}
            placeholder={t('notes')}
            className="h-8 sm:h-10 text-base sm:text-sm"
          />
        </div>
        
        <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-[0_-8px_15px_rgba(0,0,0,0.08)] md:sticky md:bottom-0 md:bg-white md:border-t-0 md:px-0 md:pt-4 md:pb-4 md:shadow-none ${cartPreviewOpen ? 'top-0 flex flex-col pt-safe md:top-auto md:pt-4 md:h-auto' : ''}`}>
          <div className={`flex flex-col gap-2 max-w-4xl mx-auto w-full ${cartPreviewOpen ? 'flex-1 h-full' : ''}`}>
            {cartPreviewOpen ? (
              <div className="flex flex-col gap-2 h-full">
                <div className="flex justify-between items-center mb-2 mt-3 md:mt-0">
                  <span className="font-bold text-gray-900 text-xl md:text-base">
                    {language === 'he' ? 'סיכום עגלה' : 'Cart Summary'}
                    {currentOrder.supplier_name && ` - ${currentOrder.supplier_name}`}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto mb-2 border rounded-lg p-3 bg-gray-50 text-sm md:max-h-[50vh]">
                  {cartItems.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">{language === 'he' ? 'הסל ריק' : 'Cart is empty'}</div>
                  ) : (
                    cartItems.map(item => {
                      const qty = itemQuantities[item.id];
                      const itemTotal = qty * (item.price || 0);
                      const discountedTotal = item.discount ? itemTotal * (1 - item.discount / 100) : itemTotal;
                      return (
                        <div key={item.id} className="flex justify-between items-center border-b border-gray-200 py-1.5 last:border-0">
                          <div className="flex-1">
                            <span className="font-semibold text-gray-800">{item.name}</span>
                            <div className="text-xs text-gray-500">{qty} {getUnitLabel(item.unit)} x ₪{(item.price * (1 - (item.discount || 0) / 100)).toFixed(2)}</div>
                          </div>
                          <span className="font-bold text-purple-700">₪{discountedTotal.toFixed(2)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
                
                {Object.keys(itemQuantities).some(id => itemQuantities[id] > 0) && (
                  <div className="flex justify-between items-center w-full mb-1 px-1">
                    <span className="text-xl sm:text-2xl font-bold text-gray-900">
                      ₪{calculateTotal().toFixed(2)}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">{t('total_cost') || 'סך הכל'}</span>
                  </div>
                )}
                
                <div className="flex gap-2 w-full">
                  <Button type="button" variant="outline" onClick={() => setCartPreviewOpen(false)} className="h-10 shrink-0 px-4 text-gray-500 border-gray-200 rounded-lg md:w-auto font-medium text-sm">
                    {language === 'he' ? 'חזור לעריכה' : 'Back to Edit'}
                  </Button>
                  <Button type="submit" className="h-10 flex-1 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium text-sm md:rounded-lg px-1 shadow-sm">
                    {safeT('send_to_supplier', 'שלח לספק', 'Send to Supplier')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {Object.keys(itemQuantities).some(id => itemQuantities[id] > 0) && (
                  <div className="flex justify-between items-center w-full mb-1 px-1">
                    <span className="text-xl sm:text-2xl font-bold text-gray-900">
                      ₪{calculateTotal().toFixed(2)}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">{t('total_cost') || 'סך הכל'}</span>
                  </div>
                )}
                <div className="flex gap-2 w-full">
                  <Button type="button" variant="outline" onClick={onCancel} className="h-10 w-10 shrink-0 p-0 text-gray-500 border-gray-200 rounded-lg md:w-auto md:px-4">
                    <span className="md:hidden"><X className="w-4 h-4" /></span>
                    <span className="hidden md:inline">{safeT('cancel', 'ביטול', 'Cancel')}</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!currentOrder.restaurant_name) { alert(safeT('business_name_required', 'שם העסק חובה', 'Business name is required')); return; }
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
                    className="h-10 flex-[0.8] bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-sm px-1 shadow-sm transition-colors"
                  >
                    {order ? safeT('update_draft', 'עדכן טיוטה', 'Update Draft') : safeT('save_draft', 'טיוטה', 'Draft')}
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => setCartPreviewOpen(true)}
                    className="h-10 flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm px-1 shadow-sm transition-colors"
                  >
                    {language === 'he' ? 'צפה בסל' : 'Cart'}
                  </Button>
                  <Button type="submit" className="h-10 flex-[1.4] bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium text-sm px-1 shadow-sm transition-colors">
                    {safeT('send_to_supplier', 'שלח לספק', 'Send to Supplier')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </form>
    </motion.div>
  );
}