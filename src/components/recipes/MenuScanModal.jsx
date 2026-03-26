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
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="w-5 h-5" />
            {language === 'he' ? 'מתכונים חסרים!' : 'Missing Recipes!'}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {language === 'he' 
              ? 'סרקנו את התפריט שלך ומצאנו ששכחת להוסיף את המתכונים הבאים למערכת. חבל שלא יהיו לך את כל הנתונים לתמחור התפריט או הנדסת תפריט!'
              : 'We scanned your menu and found that you forgot to add the following recipes to the system. It is a pity you will not have all the data to make menu pricing or menu engineering!'}
            <br/><br/>
            {language === 'he'
              ? 'אנא הוסף אותם ידנית או דרך קישור ה-Google Sheets שלך:'
              : 'Please add them manually or via your Google Sheets link:'}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-60 overflow-y-auto bg-orange-50 p-4 rounded-md border border-orange-100">
          <ul className="list-disc list-inside space-y-1 text-orange-800 font-medium">
            {missingRecipes.map((recipe, idx) => (
              <li key={idx}>{recipe}</li>
            ))}
          </ul>
          {missingRecipes.length === 0 && (
            <p className="text-green-600 font-bold">
              {language === 'he' ? 'כל המנות בתפריט נמצאות במערכת! כל הכבוד!' : 'All menu items are in the system! Great job!'}
            </p>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button onClick={onClose} className="bg-[#107c41] hover:bg-[#0c5e31]">
            {language === 'he' ? 'הבנתי' : 'Got it'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}