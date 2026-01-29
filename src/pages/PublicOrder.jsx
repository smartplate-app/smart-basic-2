import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';

export default function PublicOrderPage() {
    const [order, setOrder] = useState(null);
    const [error, setError] = useState(null);
    const [language, setLanguage] = useState('he');
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const id = urlParams.get('id');
                const orderData = urlParams.get('d');

                // 1) If inline payload exists, prefer it (shows latest edits immediately)
                if (orderData) {
                    try {
                        const parsed = JSON.parse(decodeURIComponent(orderData));
                        const fullOrder = {
                            order_number: parsed.n,
                            supplier_name: parsed.s,
                            restaurant_name: parsed.r,
                            restaurant_address: parsed.a,
                            delivery_date: parsed.d,
                            items: (parsed.i || []).map(item => ({ item_name: item.n, quantity: item.q, unit: item.u })),
                            notes: parsed.t,
                            total_cost: Number(parsed.m ?? parsed.total_cost ?? 0)
                        };
                        setOrder(fullOrder);
                        return;
                    } catch (e) {
                        console.warn('Failed to parse inline payload, will try by id', e);
                    }
                }

                // 2) Otherwise, fetch by id
                if (id) {
                    const res = await fetch('/functions/getPublicOrder', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: id })
                    });
                    const json = await res.json();
                    if (res.ok && json?.order) {
                        setOrder(json.order);
                        return;
                    }
                    setError(json?.error || 'Invalid order data');
                    return;
                }

                // 3) No data provided
                setError('No order data');
            } catch (err) {
                console.error('Parse error:', err);
                setError('Invalid order data');
            }
        })();
    }, []);

    const isRTL = language === 'he';

    // Calculate total: prefer sum of item totals/prices, fallback to stored total_cost
    const computeItemTotal = (it) => {
        const tot = Number(it?.total);
        if (!isNaN(tot) && isFinite(tot) && tot > 0) return tot;
        const p = Number(it?.price);
        const q = Number(it?.quantity);
        if (!isNaN(p) && isFinite(p) && !isNaN(q) && isFinite(q) && q > 0) return p * q;
        return 0;
    };
    const itemsTotal = (order?.items || []).reduce((sum, it) => sum + computeItemTotal(it), 0);
    const effectiveTotal = itemsTotal > 0 ? itemsTotal : Number(order?.total_cost || 0);
    const formattedTotal = effectiveTotal > 0 ? effectiveTotal.toLocaleString(language === 'he' ? 'he-IL' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null;

    const handleDownloadImage = async () => {
        try {
            setDownloading(true);
            const element = document.getElementById('order-content');
            
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#ffffff',
                windowWidth: 800,
                logging: false,
                useCORS: true
            });
            
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `order-${order.order_number}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                setDownloading(false);
            }, 'image/png', 1.0);
        } catch (error) {
            console.error('Error downloading image:', error);
            setDownloading(false);
        }
    };

    if (error) {
        return (
            <div style={{ 
                minHeight: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontFamily: 'system-ui, sans-serif',
                background: '#f5f5f5'
            }}>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                    <h1 style={{ color: '#dc2626' }}>{language === 'he' ? 'שגיאה' : 'Error'}</h1>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div style={{ 
                minHeight: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontFamily: 'system-ui, sans-serif'
            }}>
                <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    border: '4px solid #e5e7eb',
                    borderTopColor: '#3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <>
            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    #order-content {
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        max-width: 100% !important;
                    }
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
            
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                padding: '16px',
                fontFamily: 'system-ui, sans-serif',
                direction: isRTL ? 'rtl' : 'ltr'
            }}>
                {/* Language Toggle */}
                <button
                    onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
                    className="no-print"
                    style={{
                        position: 'fixed',
                        top: '16px',
                        left: '16px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '44px',
                        height: '44px',
                        cursor: 'pointer',
                        fontSize: '18px',
                        zIndex: 100,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}
                >
                    🌐
                </button>

                <div id="order-content" style={{
                maxWidth: '800px',
                margin: '0 auto',
                backgroundColor: 'white',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: 'white',
                    padding: '32px',
                    textAlign: 'center'
                }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                        {language === 'he' ? 'הזמנה' : 'Order'} #{order.order_number}
                    </h1>
                    <p style={{ fontSize: '16px', opacity: 0.9, margin: 0 }}>
                        {language === 'he' ? 'ספק:' : 'Supplier:'} {order.supplier_name}
                    </p>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                    {/* Business Info */}
                    <div style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '20px',
                        border: '2px solid #e2e8f0'
                    }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 12px 0' }}>
                            {language === 'he' ? 'פרטי העסק' : 'Business Details'}
                        </h2>
                        <p style={{ margin: '8px 0', fontSize: '16px' }}>
                            <strong>🏢 {order.restaurant_name}</strong>
                        </p>
                        {order.restaurant_address && (
                            <p style={{ margin: '8px 0', fontSize: '14px', color: '#64748b' }}>
                                📍 {order.restaurant_address}
                            </p>
                        )}
                    </div>

                    {/* Delivery Date */}
                    {order.delivery_date && (
                        <div style={{
                            backgroundColor: '#fef3c7',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '20px',
                            border: '2px solid #fbbf24',
                            textAlign: 'center'
                        }}>
                            <p style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#92400e' }}>
                                📅 {language === 'he' ? 'תאריך אספקה:' : 'Delivery Date:'} {new Date(order.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}
                            </p>
                        </div>
                    )}

                    {/* Items List */}
                    <div style={{
                        backgroundColor: '#f0fdf4',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '20px',
                        border: '2px solid #22c55e'
                    }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#15803d', margin: '0 0 16px 0' }}>
                            📋 {language === 'he' ? 'רשימת מוצרים' : 'Items List'}
                        </h2>
                        
                        <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f9fafb' }}>
                                        <th style={{ padding: '12px', textAlign: isRTL ? 'right' : 'left', borderBottom: '1px solid #e5e7eb' }}>#</th>
                                        <th style={{ padding: '12px', textAlign: isRTL ? 'right' : 'left', borderBottom: '1px solid #e5e7eb' }}>
                                            {language === 'he' ? 'מוצר' : 'Item'}
                                        </th>
                                        <th style={{ padding: '12px', textAlign: isRTL ? 'right' : 'left', borderBottom: '1px solid #e5e7eb' }}>
                                            {language === 'he' ? 'כמות' : 'Qty'}
                                        </th>
                                        <th style={{ padding: '12px', textAlign: isRTL ? 'right' : 'left', borderBottom: '1px solid #e5e7eb' }}>
                                            {language === 'he' ? 'יחידה' : 'Unit'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items && order.items.map((item, index) => (
                                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                                            <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>{index + 1}</td>
                                            <td style={{ padding: '12px', fontWeight: '500', borderBottom: '1px solid #e5e7eb' }}>{item.item_name}</td>
                                            <td style={{ padding: '12px', fontWeight: '600', color: '#059669', borderBottom: '1px solid #e5e7eb' }}>{item.quantity}</td>
                                            <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>{item.unit}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                            {formattedTotal && (
                            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#dcfce7', borderRadius: '8px', border: '1px solid #16a34a', textAlign: 'center' }}>
                                <span style={{ fontSize: '18px', fontWeight: 700, color: '#166534' }}>
                                    {language === 'he' ? 'סה״כ הזמנה:' : 'Order Total:'} ₪{formattedTotal}
                                </span>
                            </div>
                            )}
                            </div>

                    {/* Notes */}
                    {order.notes && (
                        <div style={{
                            backgroundColor: '#fef7cd',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '20px',
                            border: '2px solid #f59e0b'
                        }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#92400e', margin: '0 0 8px 0' }}>
                                📝 {language === 'he' ? 'הערות' : 'Notes'}
                            </h3>
                            <p style={{ margin: 0, color: '#78350f' }}>{order.notes}</p>
                        </div>
                    )}

                    {/* Footer */}
                    <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #e5e7eb', color: '#6b7280' }}>
                        <p style={{ fontSize: '12px', margin: 0 }}>Smart Plate - {language === 'he' ? 'מערכת ניהול ספקים' : 'Supplier Management'}</p>
                    </div>
                </div>
            </div>




            </div>
        </>
    );
}