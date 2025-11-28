import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, X, Send, Loader, HelpCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "./LanguageProvider";
import { createPageUrl } from "@/utils";

export default function AppHelpChat({ currentPage, suppliers, onSupplierAdded, onItemAdded }) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const isSupplierPage = currentPage === 'Suppliers';

  const appGuide = {
    he: {
      // Labor & Scheduling
      add_worker: {
        title: "הוספת עובד",
        steps: "1. לך לדף 'ניהול עלות עבודה'\n2. לחץ על 'הוסף עובד חדש'\n3. מלא את פרטי העובד (שם, טלפון, תפקיד, סוג תשלום)\n4. לחץ 'שמור'",
        link: "LaborCost"
      },
      create_schedule: {
        title: "יצירת לוח משמרות",
        steps: "1. לך לדף 'ניהול עלות עבודה'\n2. בחר את השבוע הרצוי\n3. לחץ פעמיים על תא ביום ותפקיד להוספת משמרת\n4. בחר עובד, שעות התחלה וסיום\n5. לחץ 'שמור לוח משמרות'",
        link: "LaborCost"
      },
      send_schedule: {
        title: "שליחת לוח משמרות",
        steps: "1. צור לוח משמרות\n2. לחץ על 'שלח ב-WhatsApp' לשליחה לעובדים\n3. או לחץ על 'שלח אימייל' לשליחה במייל",
        link: "LaborCost"
      },
      // Orders
      create_order: {
        title: "יצירת הזמנה",
        steps: "1. לך לדף 'הזמנות'\n2. לחץ על 'הזמנה חדשה'\n3. בחר ספק\n4. הוסף פריטים וכמויות\n5. לחץ 'שמור' ושלח ב-WhatsApp",
        link: "Orders"
      },
      // Suppliers & Items
      add_supplier: {
        title: "הוספת ספק",
        steps: "1. לך לדף 'ספקים'\n2. לחץ על 'הוסף ספק חדש'\n3. מלא שם, טלפון ואימייל\n4. לחץ 'שמור'",
        link: "Suppliers"
      },
      add_item: {
        title: "הוספת פריט",
        steps: "1. לך לדף 'פריטים' או 'ספקים'\n2. לחץ על 'הוסף פריט'\n3. בחר ספק ומלא פרטי הפריט\n4. לחץ 'שמור'",
        link: "Items"
      },
      import_items: {
        title: "ייבוא פריטים מאקסל",
        steps: "1. לך לדף 'ספקים'\n2. לחץ על 'ייבוא/ייצוא אקסל'\n3. בחר 'העלה פריטים'\n4. בחר ספק והעלה קובץ",
        link: "Suppliers"
      },
      // Receipts
      receive_supply: {
        title: "קליטת אספקה",
        steps: "1. לך לדף 'תעודות משלוח'\n2. לחץ על 'קליטת אספקה חדשה'\n3. בחר הזמנה או הזן ידנית\n4. סרוק חשבונית או הזן נתונים\n5. אמת כמויות ומחירים",
        link: "SupplyReceipts"
      },
      // Inventory
      inventory_count: {
        title: "ספירת מלאי",
        steps: "1. לך לדף 'ספירה חודשית'\n2. לחץ על 'ספירה חדשה'\n3. בחר מחסן (אופציונלי)\n4. הזן כמויות לכל פריט\n5. שמור את הספירה",
        link: "MonthlyCount"
      },
      // Dashboard
      view_dashboard: {
        title: "צפייה בדשבורד",
        steps: "1. לך לדף 'דשבורד'\n2. בחר חודש\n3. הזן מכירות בפועל\n4. צפה בעלויות עבודה ומזון\n5. השווה ליעדים",
        link: "Dashboard"
      }
    },
    en: {
      add_worker: {
        title: "Add Worker",
        steps: "1. Go to 'Labor Cost Management'\n2. Click 'Add New Worker'\n3. Fill worker details (name, phone, position, payment type)\n4. Click 'Save'",
        link: "LaborCost"
      },
      create_schedule: {
        title: "Create Schedule",
        steps: "1. Go to 'Labor Cost Management'\n2. Select the desired week\n3. Double-click a cell (day + position) to add shift\n4. Select worker, start and end times\n5. Click 'Save Schedule'",
        link: "LaborCost"
      },
      send_schedule: {
        title: "Send Schedule",
        steps: "1. Create a schedule\n2. Click 'Send WhatsApp' to send to workers\n3. Or click 'Send Email' to send via email",
        link: "LaborCost"
      },
      create_order: {
        title: "Create Order",
        steps: "1. Go to 'Orders'\n2. Click 'New Order'\n3. Select supplier\n4. Add items and quantities\n5. Click 'Save' and send via WhatsApp",
        link: "Orders"
      },
      add_supplier: {
        title: "Add Supplier",
        steps: "1. Go to 'Suppliers'\n2. Click 'Add New Supplier'\n3. Fill name, phone and email\n4. Click 'Save'",
        link: "Suppliers"
      },
      add_item: {
        title: "Add Item",
        steps: "1. Go to 'Items' or 'Suppliers'\n2. Click 'Add Item'\n3. Select supplier and fill item details\n4. Click 'Save'",
        link: "Items"
      },
      import_items: {
        title: "Import Items from Excel",
        steps: "1. Go to 'Suppliers'\n2. Click 'Excel Import/Export'\n3. Select 'Upload Items'\n4. Choose supplier and upload file",
        link: "Suppliers"
      },
      receive_supply: {
        title: "Receive Supply",
        steps: "1. Go to 'Supply Receipts'\n2. Click 'New Supply Receipt'\n3. Select order or enter manually\n4. Scan invoice or enter data\n5. Verify quantities and prices",
        link: "SupplyReceipts"
      },
      inventory_count: {
        title: "Inventory Count",
        steps: "1. Go to 'Monthly Count'\n2. Click 'New Count'\n3. Select warehouse (optional)\n4. Enter quantities for each item\n5. Save the count",
        link: "MonthlyCount"
      },
      view_dashboard: {
        title: "View Dashboard",
        steps: "1. Go to 'Dashboard'\n2. Select month\n3. Enter actual sales\n4. View labor and food costs\n5. Compare to goals",
        link: "Dashboard"
      }
    }
  };

  const t = {
    he: {
      title: "עוזר חכם",
      welcome: isSupplierPage 
        ? "שלום! 👋\n\nאני יכול לעזור לך:\n• להוסיף ספקים ופריטים (פשוט כתוב לי)\n• לענות על שאלות איך להשתמש באפליקציה\n\nמה תרצה לעשות?"
        : "שלום! 👋\n\nאני העוזר החכם שלך. אני יכול לעזור לך להבין איך להשתמש באפליקציה.\n\nשאל אותי כל שאלה, למשל:\n• \"איך מוסיפים עובד?\"\n• \"איך יוצרים לוח משמרות?\"\n• \"איך מקבלים אספקה?\"",
      typeMessage: "שאל שאלה או כתוב מה להוסיף...",
      processing: "מעבד...",
      supplierAdded: "ספק נוסף בהצלחה!",
      itemAdded: "פריט נוסף בהצלחה!",
      error: "שגיאה בעיבוד הבקשה",
      goToPage: "לחץ כאן לעבור לדף",
      notUnderstood: "לא הבנתי. נסה לשאול שאלה על איך להשתמש באפליקציה, או כתוב מה תרצה להוסיף."
    },
    en: {
      title: "Smart Assistant",
      welcome: isSupplierPage 
        ? "Hi! 👋\n\nI can help you:\n• Add suppliers and items (just tell me)\n• Answer questions about how to use the app\n\nWhat would you like to do?"
        : "Hi! 👋\n\nI'm your smart assistant. I can help you understand how to use the app.\n\nAsk me any question, for example:\n• \"How do I add a worker?\"\n• \"How do I create a schedule?\"\n• \"How do I receive supplies?\"",
      typeMessage: "Ask a question or type what to add...",
      processing: "Processing...",
      supplierAdded: "Supplier added successfully!",
      itemAdded: "Item added successfully!",
      error: "Error processing request",
      goToPage: "Click here to go to page",
      notUnderstood: "I didn't understand. Try asking a question about how to use the app, or tell me what you want to add."
    }
  }[language] || {};

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: 'assistant', content: t.welcome }]);
    }
  }, [isOpen, isSupplierPage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const findSupplierByName = (name) => {
    if (!name || !suppliers?.length) return null;
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
      const guideTopics = Object.keys(appGuide[language] || appGuide.en);
      
      // Use LLM to understand intent
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this user message and determine the intent.

User message: "${userMessage}"

Available help topics: ${guideTopics.join(', ')}
${isSupplierPage ? `Available suppliers: ${suppliers?.map(s => s.name).join(', ') || 'None'}` : ''}

Determine if the user wants:
1. Help/question about how to use the app (action: "help", topic: one of the available topics)
2. ${isSupplierPage ? 'Add a supplier (action: "add_supplier", extract: name, phone, email, contact_person)' : ''}
3. ${isSupplierPage ? 'Add an item to a supplier (action: "add_item", extract: item_name, supplier_name, catalog_number, unit, price)' : ''}
4. Unknown request (action: "unknown")

Return JSON with action and relevant data.`,
        response_json_schema: {
          type: "object",
          properties: {
            action: { type: "string" },
            topic: { type: "string" },
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

      if (response.action === 'help' && response.topic) {
        const guide = (appGuide[language] || appGuide.en)[response.topic];
        if (guide) {
          const pageUrl = createPageUrl(guide.link);
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `📖 **${guide.title}**\n\n${guide.steps}`,
            link: { url: pageUrl, label: t.goToPage }
          }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: t.notUnderstood }]);
        }
      } else if (isSupplierPage && response.action === 'add_supplier' && response.name) {
        await base44.entities.Supplier.create({
          name: response.name,
          phone: response.phone || "",
          email: response.email || "",
          contact_person: response.contact_person || "",
          supplier_type: "simple"
        });
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `✅ ${t.supplierAdded}\n📦 ${response.name}${response.phone ? `\n📞 ${response.phone}` : ''}`
        }]);
        if (onSupplierAdded) onSupplierAdded();

      } else if (isSupplierPage && response.action === 'add_item' && response.item_name) {
        const supplier = findSupplierByName(response.supplier_name);
        
        if (!supplier) {
          const noSuppliersMsg = language === 'he' ? 'אין ספקים במערכת. הוסף ספק קודם.' : 'No suppliers in system. Add a supplier first.';
          const notFoundMsg = language === 'he' ? 'לא מצאתי את הספק. ספקים קיימים:' : 'Supplier not found. Available suppliers:';
          
          if (!suppliers?.length) {
            setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${noSuppliersMsg}` }]);
          } else {
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: `❌ ${notFoundMsg}\n${suppliers.map(s => `• ${s.name}`).join('\n')}`
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
            content: `✅ ${t.itemAdded}\n📦 ${response.item_name}\n🏪 ${supplier.name}`
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
        {isOpen ? <X className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <Card className={`fixed bottom-24 ${isRTL ? 'left-6' : 'right-6'} z-50 w-80 md:w-96 shadow-2xl border-2 border-purple-200`} dir={isRTL ? 'rtl' : 'ltr'}>
          <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg py-3">
            <CardTitle className={`text-lg flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <HelpCircle className="w-5 h-5" />
              {t.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Messages */}
            <div className="h-64 overflow-y-auto space-y-3 pr-1">
              {messages.map((msg, idx) => (
                <div key={idx}>
                  <div
                    className={`p-3 rounded-lg text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-purple-100 text-purple-900 ml-6 rtl:mr-6 rtl:ml-0'
                        : 'bg-gray-100 text-gray-800 mr-6 rtl:ml-6 rtl:mr-0'
                    } ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {msg.content}
                  </div>
                  {msg.link && (
                    <a 
                      href={msg.link.url}
                      className={`block mt-2 text-sm text-purple-600 hover:text-purple-800 underline ${isRTL ? 'text-right mr-6' : 'text-left ml-6'}`}
                    >
                      🔗 {msg.link.label}
                    </a>
                  )}
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