import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Send, Check, CheckCircle2, Image as ImageIcon, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OrderDemoAnimation({ isHe }) {
  const [phase, setPhase] = useState(0); 
  // 0: Order App Summary
  // 1: WhatsApp Empty
  // 2: WhatsApp Pasting (Image preview + text)
  // 3: WhatsApp Sent

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((prev) => (prev + 1) % 4);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const variants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 }
  };

  return (
    <div className="w-64 h-44 bg-gray-100 rounded-xl overflow-hidden relative border border-gray-200 shadow-inner" dir="ltr">
      <AnimatePresence mode="wait">
        
        {/* Phase 0: App Screen */}
        {phase === 0 && (
          <motion.div 
            key="app"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 flex flex-col bg-white"
          >
            <div className="bg-blue-600 text-white p-2 flex justify-between items-center shadow-sm">
              <span className="text-[10px] font-bold">{isHe ? 'סיכום הזמנה' : 'Order Summary'}</span>
              <ShoppingCart className="w-3 h-3" />
            </div>
            <div className="flex-1 p-2 space-y-1.5 flex flex-col">
              <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded border border-gray-100">
                <span className="text-[9px] font-medium text-gray-700">{isHe ? 'עגבניות' : 'Tomatoes'}</span>
                <span className="text-[9px] font-bold text-blue-600">5 kg</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded border border-gray-100">
                <span className="text-[9px] font-medium text-gray-700">{isHe ? 'מלפפונים' : 'Cucumbers'}</span>
                <span className="text-[9px] font-bold text-blue-600">5 kg</span>
              </div>
              
              <div className="mt-auto flex justify-center pb-2">
                <motion.div 
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="bg-green-500 text-white rounded-full px-4 py-1.5 shadow-md flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span className="text-[9px] font-bold">{isHe ? 'שליחה בוואטסאפ' : 'Send WhatsApp'}</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Phase 1: WhatsApp Empty */}
        {phase === 1 && (
          <motion.div 
            key="wa-empty"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 flex flex-col bg-[#e5ddd5]"
          >
            <div className="bg-[#075e54] h-8 flex items-center px-3 gap-2 shadow-sm z-10">
              <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                <Users className="w-3 h-3 text-gray-500" />
              </div>
              <span className="text-white text-[10px] font-bold">{isHe ? 'ספק הירקות' : 'Veggie Supplier'}</span>
            </div>
            <div className="flex-1 p-2 flex flex-col justify-end">
              {/* Empty Chat Area */}
            </div>
            <div className="bg-[#f0f0f0] p-1.5 flex gap-1 items-center z-10">
              <div className="flex-1 bg-white rounded-full h-6 px-3 flex items-center">
                <span className="text-[9px] text-gray-400">{isHe ? 'הקלד הודעה...' : 'Type a message...'}</span>
              </div>
              <div className="w-6 h-6 bg-[#00897b] rounded-full flex items-center justify-center text-white">
                <Send className="w-3 h-3 ml-0.5" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Phase 2: WhatsApp Pasting Preview */}
        {phase === 2 && (
          <motion.div 
            key="wa-paste"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 flex flex-col bg-black/90"
          >
            <div className="flex-1 flex flex-col items-center justify-center p-3">
              {/* Fake Image Preview container (when pasting image + text in WA) */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white rounded-lg w-full max-w-[140px] overflow-hidden shadow-2xl relative"
              >
                <div className="bg-gray-100 h-20 flex items-center justify-center border-b border-gray-200">
                   {/* Fake Order Card Image */}
                   <div className="w-20 h-16 bg-white shadow-sm flex flex-col">
                     <div className="h-2 bg-blue-600 w-full"></div>
                     <div className="p-1 space-y-1 mt-1">
                        <div className="h-1 bg-gray-300 w-3/4 rounded"></div>
                        <div className="h-1 bg-gray-200 w-1/2 rounded"></div>
                        <div className="h-1 bg-gray-200 w-full rounded"></div>
                     </div>
                   </div>
                </div>
                <div className="p-2">
                  <div className="text-[8px] text-gray-800 font-medium leading-tight">
                    Order #482<br/>
                    • Tomatoes: 5 kg<br/>
                    • Cucumbers: 5 kg
                  </div>
                </div>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1, type: 'spring' }}
                  className="absolute -bottom-3 -right-3 w-10 h-10 bg-[#00897b] rounded-full flex items-center justify-center text-white shadow-lg border-2 border-black"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Phase 3: WhatsApp Sent */}
        {phase === 3 && (
          <motion.div 
            key="wa-sent"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 flex flex-col bg-[#e5ddd5]"
          >
             <div className="bg-[#075e54] h-8 flex items-center px-3 gap-2 shadow-sm z-10">
              <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                <Users className="w-3 h-3 text-gray-500" />
              </div>
              <span className="text-white text-[10px] font-bold">{isHe ? 'ספק הירקות' : 'Veggie Supplier'}</span>
            </div>
            
            <div className="flex-1 p-3 flex flex-col justify-end items-end">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0, x: 20 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                className="bg-[#dcf8c6] rounded-lg rounded-tr-none shadow-sm max-w-[85%] text-left overflow-hidden relative"
              >
                {/* Sent Image Preview */}
                <div className="bg-gray-200 w-full h-16 flex items-center justify-center p-1 border-b border-[#cce5b6]">
                   <div className="w-full h-full bg-white shadow-sm flex flex-col relative">
                     <div className="h-1.5 bg-blue-600 w-full"></div>
                     <div className="p-1 space-y-0.5">
                        <div className="h-1 bg-gray-300 w-3/4 rounded"></div>
                        <div className="h-1 bg-gray-200 w-1/2 rounded"></div>
                        <div className="h-1 bg-gray-200 w-full rounded mt-1"></div>
                     </div>
                   </div>
                </div>
                
                {/* Sent Text */}
                <div className="p-1.5 pt-1">
                  <div className="text-[8px] font-bold text-gray-800">Order #482</div>
                  <div className="text-[7px] text-gray-700 leading-tight">
                    • Tomatoes: 5 kg<br/>
                    • Cucumbers: 5 kg
                  </div>
                  <div className="text-[6px] text-gray-500 text-right mt-0.5 flex justify-end items-center gap-0.5">
                    10:30 <Check className="w-2 h-2 text-blue-500" />
                  </div>
                </div>
              </motion.div>
            </div>
            
            <div className="bg-[#f0f0f0] p-1.5 flex gap-1 items-center z-10">
              <div className="flex-1 bg-white rounded-full h-6 px-3 flex items-center"></div>
              <div className="w-6 h-6 bg-[#00897b] rounded-full flex items-center justify-center text-white">
                <Send className="w-3 h-3 ml-0.5" />
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}