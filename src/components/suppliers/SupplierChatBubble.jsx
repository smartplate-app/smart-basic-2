import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, X, Send, Loader } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "../LanguageProvider";

export default function SupplierChatBubble({ suppliers, onSupplierAdded, onItemAdded }) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const t = {
    he: {
      title: "עוזר הוספה מהירה",
      welcome: "שלום! אני יכול לעזור לך להוסיף ספקים או פריטים. פשוט כתוב לי מה אתה רוצה להוסיף.\n\nלדוגמה:\n• \"הוסף ספק בשם משקאות ישראל טלפון 03-1234567\"\n• \"הוסף פריט קוקה קולה 1.5 ליטר מחיר 5.90 לספק משקאות ישראל\"",
      typeMessage: "כתוב מה להוסיף...",
      processing: "מעבד...",
      supplierAdded: "ספק נוסף בהצלחה!",
      itemAdded: "פריט נוסף בהצלחה!",
      error: "שגיאה בעיבוד הבקשה",
      supplierNotFound: "לא מצאתי את הספק. רשימת הספקים הקיימים:",
      noSuppliers: "אין ספקים במערכת. הוסף ספק קודם.",
      notUnderstood: "לא הבנתי. נסה לכתוב משהו כמו:\n• \"הוסף ספק [שם] טלפון [מספר]\"\n• \"הוסף פריט [שם] מחיר [מחיר] לספק [שם ספק]\""
    },
    en: {
      title: "Quick Add Assistant",
      welcome: "Hi! I can help you add suppliers or items. Just tell me what you want to add.\n\nFor example:\n• \"Add supplier Israel Drinks phone 03-1234567\"\n• \"Add item Coca Cola 1.5L price 5.90 to supplier Israel Drinks\"",
      typeMessage: "Type what to add...",
      processing: "Processing...",
      supplierAdded: "Supplier added successfully!",
      itemAdded: "Item added successfully!",
      error: "Error processing request",
      supplierNotFound: "Supplier not found. Available suppliers:",
      noSuppliers: "No suppliers in the system. Add a supplier first.",
      notUnderstood: "I didn't understand. Try something like:\n• \"Add supplier [name] phone [number]\"\n• \"Add item [name] price [price] to supplier [supplier name]\""
    }
  }[language] || {
    he: {
      title: "עוזר הוספה מהירה",
      welcome: "שלום! אני יכול לעזור לך להוסיף ספקים או פריטים.",
      typeMessage: "כתוב מה להוסיף...",
      processing: "מעבד...",
      supplierAdded: "ספק נוסף בהצלחה!",
      itemAdded: "פריט נוסף בהצלחה!",
      error: "שגיאה"
    }
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: 'assistant', content: t.welcome }]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const findSupplierByName = (name) => {
    if (!name || !suppliers.length) return null;
    const lowerName = name.toLowerCase().trim();
    return suppliers.find(s => 
      s.name.toLowerCase().includes(lowerName) || 
      lowerName.includes(s.name.toLowerCase())
    );
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      // Use LLM to understand the intent and extract data
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this message and determine if the user wants to add a supplier or an item.
        
Available suppliers: ${suppliers.map(s => s.name).join(', ') || 'None'}

User message: "${userMessage}"

Return JSON with:
- action: "add_supplier" or "add_item" or "unknown"
- For add_supplier: name (required), phone (optional), email (optional), contact_person (optional)
- For add_item: item_name (required), supplier_name (required - must match one of the available suppliers), catalog_number (optional), unit (kg/liter/unit/case, default: unit), price (number, default: 0)

If the message mentions adding an item but the supplier name doesn't match any available supplier, still return action "add_item" but set supplier_name to what the user wrote.`,
        response_json_schema: {
          type: "object",
          properties: {
            action: { type: "string" },
            name: { type: "string" },
            phone: { type: "string" },
            email: { type: "string" },
            contact_person: { type: "string" },
            item_name: { type: "string" },
            supplier_name: { type: "string" },
            catalog_number: { type: "string" },
            unit: { type: "string" },
            price: { type: "number" }
          },
          required: ["action"]
        }
      });

      if (response.action === 'add_supplier' && response.name) {
        await base44.entities.Supplier.create({
          name: response.name,
          phone: response.phone || "",
          email: response.email || "",
          contact_person: response.contact_person || "",
          supplier_type: "simple"
        });
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `✅ ${t.supplierAdded}\n📦 ${response.name}${response.phone ? `\n📞 ${response.phone}` : ''}${response.email ? `\n📧 ${response.email}` : ''}`
        }]);
        if (onSupplierAdded) onSupplierAdded();

      } else if (response.action === 'add_item' && response.item_name) {
        const supplier = findSupplierByName(response.supplier_name);
        
        if (!supplier) {
          if (suppliers.length === 0) {
            setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${t.noSuppliers}` }]);
          } else {
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: `❌ ${t.supplierNotFound}\n${suppliers.map(s => `• ${s.name}`).join('\n')}`
            }]);
          }
        } else {
          const validUnits = ['kg', 'liter', 'unit', 'case'];
          const unit = validUnits.includes(response.unit) ? response.unit : 'unit';
          
          await base44.entities.Item.create({
            name: response.item_name,
            supplier_id: supplier.id,
            supplier_name: supplier.name,
            catalog_number: response.catalog_number || "",
            unit: unit,
            price: response.price || 0,
            discount: 0,
            units_per_package: 1
          });
          
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `✅ ${t.itemAdded}\n📦 ${response.item_name}\n🏪 ${supplier.name}${response.price ? `\n💰 ${response.price}` : ''}`
          }]);
          if (onItemAdded) onItemAdded();
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: t.notUnderstood }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${t.error}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-50 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-110`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <Card className={`fixed bottom-24 ${isRTL ? 'left-6' : 'right-6'} z-50 w-80 md:w-96 shadow-2xl border-2 border-purple-200`} dir={isRTL ? 'rtl' : 'ltr'}>
          <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg py-3">
            <CardTitle className={`text-lg flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <MessageCircle className="w-5 h-5" />
              {t.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Messages */}
            <div className="h-64 overflow-y-auto space-y-3 pr-1">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-purple-100 text-purple-900 ml-6 rtl:mr-6 rtl:ml-0'
                      : 'bg-gray-100 text-gray-800 mr-6 rtl:ml-6 rtl:mr-0'
                  } ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  {msg.content}
                </div>
              ))}
              {loading && (
                <div className={`flex items-center gap-2 text-gray-500 text-sm p-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Loader className="w-4 h-4 animate-spin" />
                  {t.processing}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.typeMessage}
                className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                disabled={loading}
              />
              <Button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                size="icon"
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}