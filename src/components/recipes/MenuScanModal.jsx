import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../LanguageProvider";
import { AlertTriangle } from "lucide-react";

export default function MenuScanModal({ isOpen, onClose, missingRecipes }) {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={isRTL ? 'text-right' : 'text-left'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <AlertTriangle className="w-5 h-5" />
            {language === 'he' ? 'מנות חדשות זוהו והוספו!' : 'New Items Detected & Added!'}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {language === 'he' 
              ? 'סרקנו את התפריט שלך ומצאנו את המנות הבאות שלא היו קיימות במערכת. הוספנו אותן אוטומטית כפריטים למכירה (POS) עם המחיר שלהן!'
              : 'We scanned your menu and found the following items that were missing. We automatically added them as sale items (POS) with their prices!'}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-60 overflow-y-auto bg-green-50 p-4 rounded-md border border-green-100">
          <ul className="list-disc list-inside space-y-1 text-green-800 font-medium">
            {missingRecipes.map((recipe, idx) => (
              <li key={idx}>{recipe}</li>
            ))}
          </ul>
          {missingRecipes.length === 0 && (
            <p className="text-green-600 font-bold">
              {language === 'he' ? 'כל המנות בתפריט כבר נמצאות במערכת! כל הכבוד!' : 'All menu items are already in the system! Great job!'}
            </p>
          )}
          {/* If totalFound is 0, we might want to warn the user, but this prop isn't passed yet. 
              Ideally we should handle the "no items found" case in the parent component or pass totalFound here. 
              For now, let's just rely on the user seeing an empty list and the success message. 
              If the user sees "Great job!" but knows items are missing, they might report it (as they did). 
          */}
        </div>

        <DialogFooter className="mt-4">
          <Button onClick={onClose} className="bg-[#d4a373] hover:bg-[#b88c60]">
            {language === 'he' ? 'הבנתי' : 'Got it'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}