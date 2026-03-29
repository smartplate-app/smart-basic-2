import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "../LanguageProvider";
import { X } from "lucide-react";

export default function ItemEditModal({ item, isOpen, onClose, onSave }) {
  const [formData, setFormData] = React.useState(item || {});
  const { t } = useLanguage();

  React.useEffect(() => {
    if (item) {
      setFormData(item);
    }
  }, [item]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('edit_item')}</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('item_name')} *</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="catalog_number">{t('catalog_number')}</Label>
            <Input
              id="catalog_number"
              value={formData.catalog_number || ''}
              onChange={(e) => handleChange('catalog_number', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">{t('unit_of_measure')} *</Label>
              <Select
                value={formData.unit || 'unit'}
                onValueChange={(value) => handleChange('unit', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">{t('unit_kg')}</SelectItem>
                  <SelectItem value="gram">{t('unit_g')}</SelectItem>
                  <SelectItem value="liter">{t('unit_liter')}</SelectItem>
                  <SelectItem value="ml">{t('unit_ml')}</SelectItem>
                  <SelectItem value="unit">{t('unit_piece')}</SelectItem>
                  <SelectItem value="case">{t('unit_case') || 'ארגז'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="units_per_package">{t('units_per_package')}</Label>
              <Input
                id="units_per_package"
                type="number"
                min="1"
                value={formData.units_per_package || 1}
                onChange={(e) => handleChange('units_per_package', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">{t('price')}</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price || 0}
                onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">{t('discount')} %</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.discount || 0}
                onChange={(e) => handleChange('discount', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
            <Label htmlFor="minimum_stock" className="text-orange-800 font-semibold">
              {t('minimum_stock') || 'מלאי מינימום'} 📦
            </Label>
            <Input
              id="minimum_stock"
              type="number"
              step="0.01"
              min="0"
              value={formData.minimum_stock || 0}
              onChange={(e) => handleChange('minimum_stock', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-xs text-orange-600">
              {t('minimum_stock_help') || 'השאר 0 אם לא רלוונטי. כשמוגדר - בהזמנה תקבל הצעה חכמה כמה להזמין'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Input
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
              {t('save')}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              {t('cancel')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}