import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Search, Loader, Plus, Link as LinkIcon, Trash2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "../components/LanguageProvider";

export default function InvoiceItemsPage() {
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { t, language } = useLanguage();
  const [user, setUser] = useState(null);

  // States for matching
  const [selectedItems, setSelectedItems] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const effectiveEmail = currentUser.acting_as_store_email || currentUser.acting_as_user_email || currentUser.email;

      // Load InvoiceItems and Items
      const [allInvoiceItems, allItems] = await Promise.all([
        base44.entities.InvoiceItem.filter({
          $or: [
            { created_by: effectiveEmail },
            { store_owner_email: effectiveEmail }
          ]
        }, "-created_date"),
        base44.entities.Item.filter({
          $or: [
            { created_by: effectiveEmail },
            { store_owner_email: effectiveEmail }
          ]
        }, "name")
      ]);

      setInvoiceItems(allInvoiceItems);
      setItems(allItems);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async (invoiceItem) => {
    const targetItemId = selectedItems[invoiceItem.id];
    if (!targetItemId) return;

    const targetItem = items.find(i => i.id === targetItemId);
    if (!targetItem) return;

    try {
      // Create ItemAlias
      await base44.entities.ItemAlias.create({
        alias: invoiceItem.name,
        normalized: (invoiceItem.name || '').toLowerCase().trim(),
        item_id: targetItem.id,
        item_name: targetItem.name,
        supplier_id: invoiceItem.supplier_id !== 'pending' ? invoiceItem.supplier_id : undefined
      });

      // Delete the InvoiceItem
      await base44.entities.InvoiceItem.delete(invoiceItem.id);

      // Remove from list
      setInvoiceItems(prev => prev.filter(i => i.id !== invoiceItem.id));
      alert(language === 'he' ? 'מוזג בהצלחה!' : 'Merged successfully!');
    } catch (e) {
      console.error(e);
      alert(language === 'he' ? 'שגיאה במיזוג' : 'Error merging');
    }
  };

  const handleCreateNew = async (invoiceItem) => {
    try {
      const workingEmail = user?.acting_as_store_email || user?.acting_as_user_email || user?.store_user_owner_email || user?.email;
      
      const itemPayload = {
        name: invoiceItem.name,
        supplier_id: invoiceItem.supplier_id || 'pending',
        supplier_name: invoiceItem.supplier_name || 'להשלמה',
        price: invoiceItem.price || 0,
        unit: invoiceItem.unit || 'unit',
        is_pending_completion: false,
        status: 'active',
        store_owner_email: workingEmail,
        created_by: user?.email,
        source_type: 'supply_receipt',
        source_document_number: invoiceItem.source_document_number || '',
        source_document_id: invoiceItem.source_document_id || ''
      };

      await base44.entities.Item.create(itemPayload);
      await base44.entities.InvoiceItem.delete(invoiceItem.id);

      setInvoiceItems(prev => prev.filter(i => i.id !== invoiceItem.id));
      alert(language === 'he' ? 'נוצר פריט חדש בהצלחה!' : 'New item created successfully!');
    } catch (e) {
      console.error(e);
      alert(language === 'he' ? 'שגיאה ביצירת הפריט' : 'Error creating item');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(language === 'he' ? 'האם למחוק פריט זה?' : 'Delete this item?')) return;
    try {
      await base44.entities.InvoiceItem.delete(id);
      setInvoiceItems(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const filteredItems = invoiceItems.filter(item => 
    !searchTerm || (item.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="text-center md:text-start">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {language === 'he' ? 'פריטים מחשבוניות שנסרקו' : 'Scanned Invoice Items'}
          </h1>
          <p className="text-gray-600 mt-1">
            {language === 'he' 
              ? 'פריטים אלו לא זוהו בעת סריקת חשבונית. ניתן למזג אותם עם פריטים קיימים או ליצור פריט חדש.' 
              : 'These items were not recognized during invoice scan. Merge them with existing items or create new.'}
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 rtl:right-3 ltr:left-3" />
          <Input
            placeholder={language === 'he' ? 'חיפוש פריטים...' : 'Search items...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rtl:pr-9 ltr:pl-9 h-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200">
          {language === 'he' ? 'אין פריטים להצגה' : 'No items to display'}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map(invoiceItem => (
            <div key={invoiceItem.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-start md:items-center">
              
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900">{invoiceItem.name}</h3>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-1">
                  <span>{language === 'he' ? 'ספק:' : 'Supplier:'} {invoiceItem.supplier_name}</span>
                  <span>{language === 'he' ? 'מחיר:' : 'Price:'} ₪{invoiceItem.price}</span>
                  <span>{language === 'he' ? 'יחידה:' : 'Unit:'} {invoiceItem.unit}</span>
                  {invoiceItem.source_document_number && (
                    <span>{language === 'he' ? 'ממסמך:' : 'Doc:'} {invoiceItem.source_document_number}</span>
                  )}
                </div>
              </div>

              <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 items-stretch md:items-center">
                
                {/* Match Dropdown */}
                <div className="w-full sm:w-64">
                  <Select 
                    value={selectedItems[invoiceItem.id] || ""} 
                    onValueChange={(v) => setSelectedItems(prev => ({ ...prev, [invoiceItem.id]: v }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={language === 'he' ? 'בחר פריט קיים למיזוג...' : 'Select existing item to merge...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} {item.supplier_name && item.supplier_name !== 'להשלמה' ? `(${item.supplier_name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => handleMerge(invoiceItem)}
                    disabled={!selectedItems[invoiceItem.id]}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <LinkIcon className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    {language === 'he' ? 'מזג' : 'Merge'}
                  </Button>

                  <Button 
                    variant="outline"
                    onClick={() => handleCreateNew(invoiceItem)}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    {language === 'he' ? 'צור חדש' : 'Create New'}
                  </Button>

                  <Button 
                    variant="ghost"
                    onClick={() => handleDelete(invoiceItem.id)}
                    className="text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}