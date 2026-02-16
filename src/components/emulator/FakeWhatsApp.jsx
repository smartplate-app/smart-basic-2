import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function FakeWhatsApp() {
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        // Seed last sent orders
        const recent = await base44.entities.Order.filter({ status: 'sent' }, '-updated_date', 10);
        const seeded = (recent || []).map((o) => formatMsg(o));
        setMessages(seeded.reverse());
      } catch {}

      try {
        // Live updates: show a message when an order becomes sent
        unsub = base44.entities.Order.subscribe((event) => {
          const o = event?.data;
          if (!o) return;
          if (o.status === 'sent') {
            setMessages((prev) => [...prev, formatMsg(o)]);
          }
        });
      } catch {}
    })();
    return () => { try { unsub && unsub(); } catch {} };
  }, []);

  const formatMsg = (order) => {
    const when = new Date(order.updated_date || Date.now());
    const time = when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const supplier = order.supplier_name || 'Supplier';
    const num = order.order_number || order.id?.slice(0, 6) || 'N/A';
    const total = (order.total_cost != null) ? `₪${Number(order.total_cost).toFixed(2)}` : '';
    const title = `Order ${num} sent to ${supplier} ${total ? '(' + total + ')' : ''}`;
    const body = order.restaurant_name ? `From: ${order.restaurant_name}` : '';
    return { id: order.id + ':' + (order.updated_date || ''), title, body, time };
  };

  return (
    <div className="w-full">
      <div className="rounded-xl border bg-white overflow-hidden">
        {/* WhatsApp-like header */}
        <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-white/20" />
          <div className="text-sm font-semibold">Orders</div>
          <div className="ml-auto text-xs opacity-90">Emulator</div>
        </div>
        {/* Messages list */}
        <div ref={listRef} className="h-64 overflow-y-auto bg-[#E5DDD5] p-3 space-y-2">
          {messages.length === 0 && (
            <div className="text-center text-xs text-gray-600 mt-8">No sent orders yet. Send an order to see it here.</div>
          )}
          {messages.map((m, idx) => (
            <div key={m.id + ':' + idx} className="max-w-[85%] bg-white rounded-lg shadow px-3 py-2 border border-black/5">
              <div className="text-[13px] font-medium text-gray-800">{m.title}</div>
              {!!m.body && <div className="text-[12px] text-gray-600 mt-0.5">{m.body}</div>}
              <div className="text-[10px] text-gray-400 mt-1 text-right">{m.time}</div>
            </div>
          ))}
        </div>
        {/* Footer bar (dummy) */}
        <div className="bg-[#F0F0F0] px-3 py-2 flex items-center gap-2 border-t">
          <div className="flex-1 text-[12px] text-gray-500">Type a message… (disabled in emulator)</div>
          <button className="text-[12px] px-2 py-1 rounded bg-white border hover:bg-gray-50" onClick={() => setMessages([])}>Clear</button>
        </div>
      </div>
    </div>
  );
}