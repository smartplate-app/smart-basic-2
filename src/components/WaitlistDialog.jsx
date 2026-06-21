import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function WaitlistDialog({ open, onOpenChange }) {
  const [formData, setFormData] = useState({
    full_name: "",
    business_name: "",
    managers_count: "",
    phone: "",
    email: ""
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!formData.full_name || !formData.business_name || !formData.phone || !formData.email) {
      setError("Please fill in all mandatory fields.");
      return;
    }

    setLoading(true);
    try {
      await base44.entities.AccessRequest.create({
        full_name: formData.full_name,
        business_name: formData.business_name,
        managers_count: Number(formData.managers_count) || 0,
        phone: formData.phone,
        email: formData.email,
        page_url: window.location.href,
        user_agent: navigator.userAgent
      });
      setSuccess(true);
    } catch (err) {
      console.error("Failed to submit waitlist request:", err);
      setError("Failed to submit your request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) {
        // Reset state on close
        setTimeout(() => {
          setSuccess(false);
          setFormData({ full_name: "", business_name: "", managers_count: "", phone: "", email: "" });
          setError("");
        }, 300);
      }
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-xl font-bold">
            {success ? "הצטרפת בהצלחה לרשימת ההמתנה!" : "הצטרפות לרשימת המתנה"}
          </DialogTitle>
          <DialogDescription className="text-right text-gray-600">
            {success 
              ? "נוספת לרשימת ההמתנה שלנו. ניצור איתך קשר טלפוני בימים הקרובים כדי לשלוח לך הזמנה לסרטון היכרות עם צוות התמיכה שלנו ולהגדיר את המערכת."
              : "אנא מלא את פרטיך כדי להצטרף לרשימת ההמתנה של Smart Plate Basic."}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <Button onClick={() => onOpenChange(false)} className="w-full bg-[#107c41] hover:bg-[#0c5e31] mt-4">
              סגור
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-right">
            <div className="space-y-2">
              <Label htmlFor="full_name">שם מלא *</Label>
              <Input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="הכנס שם מלא"
                required
                className="text-right"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="business_name">שם המסעדה המבוקשת *</Label>
              <Input
                id="business_name"
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                placeholder="הכנס את שם המסעדה"
                required
                className="text-right"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="managers_count">כמה מנהלים יש בעסק?</Label>
              <Input
                id="managers_count"
                name="managers_count"
                type="number"
                min="0"
                value={formData.managers_count}
                onChange={handleChange}
                placeholder="מספר מנהלים"
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">מספר טלפון *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="הכנס מספר טלפון"
                required
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">כתובת אימייל *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="הכנס כתובת אימייל"
                required
                className="text-right"
              />
            </div>

            {error && <div className="text-red-500 text-sm font-medium">{error}</div>}

            <Button 
              type="submit" 
              className="w-full bg-[#107c41] hover:bg-[#0c5e31] mt-6 h-12 text-lg font-medium"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : "שלח בקשה"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}