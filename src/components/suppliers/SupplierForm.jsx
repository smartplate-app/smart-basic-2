import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Upload, Loader } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import { base44 } from "@/api/base44Client";

export default function SupplierForm({ supplier, onSubmit, onCancel }) {
  const { t, language } = useLanguage();
  const [formData, setFormData] = React.useState(supplier || {
    name: "",
    email: "",
    phone: "",
    contact_person: "",
    supplier_type: "simple",
    grant_notes: "",
    grant_amount: "",
    grant_document_url: ""
  });
  const [uploading, setUploading] = React.useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert(t('supplier_name_phone_required'));
      return;
    }
    // Sanitize numeric fields before submit
    const payload = { ...formData };
    // grant_amount: if empty -> remove; else normalize comma/dot and cast to number
    if (payload.grant_amount === "" || payload.grant_amount === null || typeof payload.grant_amount === 'undefined') {
      delete payload.grant_amount;
    } else {
      const normalized = Number(String(payload.grant_amount).replace(',', '.'));
      if (Number.isNaN(normalized)) {
        alert(language === 'he' ? 'סכום המענק אינו מספר תקין' : 'Grant amount is not a valid number');
        return;
      }
      payload.grant_amount = normalized;
    }
    onSubmit(payload);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange("grant_document_url", file_url);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert(language === 'he' ? 'שגיאה בהעלאת הקובץ' : 'Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-8"
    >
      <Card className="shadow-lg border-0">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xl font-bold">
            {supplier ? t('edit_supplier') : t('add_new_supplier')}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('company_name')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder={t('company_name')}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">{t('phone')} *</Label>
              <Input
                id="phone"
                type="tel" // Changed to 'tel' for numeric keyboard on mobile
                inputMode="tel" // Added to force numeric keyboard on iPhones
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder={t('phone')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder={t('email')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_person">{t('contact_person')}</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => handleChange("contact_person", e.target.value)}
                placeholder={t('contact_person')}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="supplier_type">{t('supplier_type')}</Label>
              <Select
                value={formData.supplier_type}
                onValueChange={(value) => handleChange("supplier_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">{t('simple_supplier')}</SelectItem>
                  <SelectItem value="catalogic">{t('catalogic_supplier')}</SelectItem>
                </SelectContent>
              </Select>
              {formData.supplier_type === "catalogic" && (
                <p className="text-sm text-gray-600 mt-1">
                  {t('catalogic_supplier_note')}
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="grant_notes">{language === 'he' ? 'הערות על מענק/הנחה מיוחדת' : 'Grant/Special Discount Notes'}</Label>
              <Textarea
                id="grant_notes"
                value={formData.grant_notes || ""}
                onChange={(e) => handleChange("grant_notes", e.target.value)}
                placeholder={language === 'he' ? 'תאר כאן את פרטי המענק או ההנחה המיוחדת...' : 'Describe grant or special discount details...'}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grant_amount">{language === 'he' ? 'סכום מענק/הנחה (₪)' : 'Grant/Discount Amount (₪)'}</Label>
              <Input
                id="grant_amount"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={formData.grant_amount || ""}
                onChange={(e) => handleChange("grant_amount", e.target.value)}
                placeholder={language === 'he' ? 'סכום' : 'Amount'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grant_document">{language === 'he' ? 'מסמך הסכם (תמונה/PDF)' : 'Agreement Document (Image/PDF)'}</Label>
              <div className="flex gap-2">
                <Input
                  id="grant_document"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="flex-1"
                />
                {uploading && <Loader className="w-5 h-5 animate-spin text-gray-600" />}
              </div>
              {formData.grant_document_url && (
                <div className="mt-2">
                  <a 
                    href={formData.grant_document_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Upload className="w-4 h-4" />
                    {language === 'he' ? 'צפה במסמך' : 'View Document'}
                  </a>
                </div>
              )}
            </div>

            <div className="md:col-span-2 flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={onCancel}>
                {t('cancel')}
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {supplier ? t('update_supplier') : t('save_supplier')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}