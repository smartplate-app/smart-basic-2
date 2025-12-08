import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';

export default function PublicOrderPage() {
    const [order, setOrder] = useState(null);
    const [error, setError] = useState(null);
    const [language, setLanguage] = useState('he');
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const loadOrder = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const token = urlParams.get('token');

                if (!token) {
                    setError(language === 'he' ? 'קישור לא תקין' : 'Invalid link');
                    return;
                }

                // Call public function (no auth required)
                const response = await base44.functions.invoke('getPublicOrderByToken', { token });

                if (!response.data.success) {
                    setError(response.data.error || (language === 'he' ? 'שגיאה בטעינת הזמנה' : 'Error loading order'));
                    return;
                }

                setOrder(response.data.order);
            } catch (err) {
                console.error('Error loading order:', err);
                setError(language === 'he' ? 'שגיאה בטעינת הזמנה' : 'Error loading order');
            }
        };

        loadOrder();
    }, [language]);

    const isRTL = language === 'he';

    const [downloading, setDownloading] = React.useState(false);

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

                    .print-button {
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        background: #2563eb;
                        color: white;
                        border: none;
                        border-radius: 50px;
                        padding: 16px 32px;
                        font-size: 18px;
                        font-weight: bold;
                        cursor: pointer;
                        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        z-index: 100;
                        transition: all 0.2s;
                    }

                    .print-button:hover {
                        background: #1d4ed8;
                        transform: translateY(-2px);
                        box-shadow: 0 6px 16px rgba(37, 99, 235, 0.5);
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

                {/* Print Button */}
                <button
                    onClick={() => window.print()}
                    className="no-print print-button"
                >
                    🖨️ {language === 'he' ? 'הדפס / שמור PDF' : 'Print / Save PDF'}
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