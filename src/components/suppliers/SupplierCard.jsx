import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, User, Edit, Trash2, PackageX, Plus, FileText, DollarSign, FileSpreadsheet } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SupplierExcelImport from "./SupplierExcelImport";
import { base44 } from "@/api/base44Client";
import ItemForm from "../items/ItemForm";

export default function SupplierCard({ supplier, onEdit, onDelete, onImportComplete }) {
  const { t, language } = useLanguage();
  const [showScanner, setShowScanner] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showDeleteItemsDialog, setShowDeleteItemsDialog] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [warehouses, setWarehouses] = useState([]);

  React.useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const user = await base44.auth.me();
      const warehousesData = await base44.entities.Warehouse.filter({ created_by: user.email }, "name");
      setWarehouses(warehousesData);
    } catch (error) {
      console.error("Error loading warehouses:", error);
    }
  };

  const handleDeleteAllItems = async () => {
    try {
      setDeleting(true);
      
      const items = await base44.entities.Item.filter({ supplier_id: supplier.id });
      
      for (const item of items) {
        await base44.entities.Item.delete(item.id);
      }
      
      alert(`${items.length} ${t('items')} ${t('delete')}d`);
      setShowDeleteItemsDialog(false);
      
      if (onImportComplete) {
        onImportComplete();
      }
      
    } catch (error) {
      console.error("Error deleting items:", error);
      alert(t('error_saving') || 'שגיאה במחיקה');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddItem = async (itemData) => {
    try {
      const user = await base44.auth.me();
      
      // Remove system fields
      const { id, created_date, updated_date, created_by_id, created_by, is_sample, ...cleanData } = itemData;
      
      await base44.entities.Item.create({
        ...cleanData,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        created_by: user.email
      });
      
      setShowAddItemDialog(false);
      
      if (onImportComplete) {
        onImportComplete();
      }
      
      alert(t('item_saved') || 'הפריט נשמר בהצלחה');
      
    } catch (error) {
      console.error("Error adding item:", error);
      alert(t('error_saving') + ': ' + (error.message || 'Unknown error'));
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{supplier.name}</h3>
                {supplier.contact_person && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <User className="w-4 h-4" />
                    {supplier.contact_person}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowAddItemDialog(true)}
                  className="text-gray-400 hover:text-blue-600"
                  title={t('add_item') || 'הוסף פריט'}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowExcelImport(true)}
                  className="text-gray-400 hover:text-green-600"
                  title={language === 'he' ? 'ייבוא פריטים מאקסל' : 'Import items from Excel'}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowDeleteItemsDialog(true)}
                  className="text-gray-400 hover:text-orange-600"
                  title={t('delete_all_items') || 'מחק את כל הפריטים'}
                >
                  <PackageX className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onEdit(supplier)}
                  className="text-gray-400 hover:text-blue-600"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onDelete(supplier.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-green-600" />
              <a 
                href={`tel:${supplier.phone}`} 
                className="text-green-600 hover:underline font-medium"
              >
                {supplier.phone}
              </a>
            </div>
            
            {supplier.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-blue-600" />
                <a 
                  href={`mailto:${supplier.email}`} 
                  className="text-blue-600 hover:underline"
                >
                  {supplier.email}
                </a>
              </div>
            )}

            {supplier.grant_notes && (
              <div className="flex items-start gap-2 text-sm bg-green-50 p-2 rounded">
                <FileText className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-green-800 font-medium">{language === 'he' ? 'מענק/הנחה:' : 'Grant/Discount:'}</p>
                  <p className="text-gray-700 text-xs mt-1">{supplier.grant_notes}</p>
                  {supplier.grant_amount && (
                    <div className="flex items-center gap-1 mt-1">
                      <DollarSign className="w-3 h-3 text-green-600" />
                      <span className="text-green-700 font-bold">₪{supplier.grant_amount.toLocaleString()}</span>
                    </div>
                  )}
                  {supplier.grant_document_url && (
                    <a 
                      href={supplier.grant_document_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs mt-1 inline-block"
                    >
                      {language === 'he' ? '📎 צפה במסמך' : '📎 View Document'}
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2">
              <Badge variant="outline" className="text-xs">
                {t('created_at')}: {new Date(supplier.created_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-CA')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showExcelImport} onOpenChange={setShowExcelImport}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === 'he' ? 'ייבוא פריטים מאקסל' : 'Import Items from Excel'}</DialogTitle>
          </DialogHeader>
          <SupplierExcelImport 
            supplier={supplier}
            onClose={() => setShowExcelImport(false)}
            onImportComplete={() => {
              setShowExcelImport(false);
              if (onImportComplete) onImportComplete();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('add_item')} - {supplier.name}</DialogTitle>
          </DialogHeader>
          <ItemForm
            item={null}
            suppliers={[supplier]}
            warehouses={warehouses}
            onSubmit={handleAddItem}
            onCancel={() => setShowAddItemDialog(false)}
            onWarehouseCreated={loadWarehouses}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteItemsDialog} onOpenChange={setShowDeleteItemsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('delete_all_items') || 'מחק את כל הפריטים'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete_all_items_confirmation') || `האם אתה בטוח שברצונך למחוק את כל הפריטים של הספק "${supplier.name}"? פעולה זו אינה ניתנת לביטול.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllItems}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? t('deleting') || 'מוחק...' : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}