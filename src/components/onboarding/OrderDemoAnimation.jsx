import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, MessageCircle, ShoppingCart, Users, Plus, Send, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OrderDemoAnimation({ isHe }) {
  const [phase, setPhase] = useState(0); // 0: Add Items, 1: Review, 2: WhatsApp

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((prev) => (prev + 1) % 3);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const variants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.1 }
  };

  return (
    <div className="w-64 h-40 bg-gray-100 rounded-xl overflow-hidden relative border border-gray-200">
      <AnimatePresence mode="wait">
        {phase === 0 && (
          <motion.div 
            key="add"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 flex flex-col p-3 bg-white"
          >
            <div className="flex items-center justify-between mb-2 border-b pb-1">
              <span className="text-xs font-bold text-gray-700">{isHe ? 'הזמנה חדשה' : 'New Order'}</span>
              <ShoppingCart className="w-3 h-3 text-blue-500" />
            </div>
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between bg-blue-50 p-1.5 rounded">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-medium">{isHe ? (i===1 ? 'עגבניות' : 'מלפפונים') : (i===1 ? 'Tomatoes' : 'Cucumbers')}</span>
                    <span className="text-[8px] text-gray-500">kg</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold">5</span>
                    <Plus className="w-3 h-3 text-blue-600" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-auto text-[9px] text-gray-400 text-center">{isHe ? 'מוסיפים פריטים...' : 'Adding items...'}</div>
          </motion.div>
        )}

        {phase === 1 && (
          <motion.div 
            key="review"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 flex flex-col p-3 bg-white"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-800">{isHe ? 'סיכום הזמנה' : 'Summary'}</span>
              <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">₪120</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <motion.div 
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="bg-green-500 text-white rounded-full p-3 shadow-lg"
              >
                <Send className="w-6 h-6 ml-0.5" />
              </motion.div>
            </div>
            <div className="mt-auto text-[9px] text-green-600 font-medium text-center">{isHe ? 'שליחה לספק...' : 'Sending...'}</div>
          </motion.div>
        )}

        {phase === 2 && (
          <motion.div 
            key="whatsapp"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 flex flex-col p-0 bg-[#e5ddd5]"
          >
            <div className="bg-[#075e54] h-8 flex items-center px-3">
              <span className="text-white text-[10px] font-bold">{isHe ? 'ספק ירקות' : 'Veggie Supplier'}</span>
            </div>
            <div className="p-3 flex flex-col items-end space-y-2">
              <div className="bg-[#dcf8c6] p-2 rounded-lg rounded-tr-none shadow-sm max-w-[85%] text-left" dir="ltr">
                <div className="text-[9px] font-bold text-gray-800 mb-1">
                  New Order #{Math.floor(Math.random() * 900) + 100}
                </div>
                <div className="space-y-0.5 text-[8px] text-gray-700">
                  <div>• Tomatoes: 5 kg</div>
                  <div>• Cucumbers: 5 kg</div>
                </div>
                <div className="text-[7px] text-gray-400 text-right mt-1 flex items-center justify-end gap-0.5">
                  10:30 <Check className="w-2 h-2 text-blue-500" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}