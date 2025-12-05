import React, { useState, useEffect } from 'react';
import { Building, MapPin, Calendar, ClipboardList, Book, Loader, AlertCircle, Printer, Globe } from 'lucide-react';

const translations = {
    he: {
        loading: 'טוען פרטי הזמנה...',
        error: 'שגיאה',
        orderNotFound: 'לא נמצא מזהה הזמנה בכתובת האתר. ודא שהקישור תקין.',
        orderNotAccessible: 'הזמנה עם מזהה זה לא נמצאה או שאינה זמינה לצפייה ציבורית.',
        fetchError: 'שגיאה באחזור פרטי ההזמנה.',
        permissionNote: 'שימו לב: כדי שהקישור הציבורי יעבוד, יש להגדיר הרשאות קריאה ציבוריות עבור הזמנות.',
        permissionInstructions: 'עבור אל Dashboard > Data > לחץ על Order > Settings > ושנה את Who can view records? ל-Anyone (public read).',
        orderNumber: 'הזמנה #',
        supplier: 'ספק:',
        status: 'סטטוס:',
        businessDetails: 'פרטי העסק המזמין',
        businessName: 'שם העסק',
        deliveryAddress: 'כתובת למשלוח',
        deliveryDate: 'תאריך אספקה מבוקש:',
        itemsList: 'רשימת מוצרים',
        itemName: 'שם מוצר',
        quantity: 'כמות',
        unit: 'יחידה',
        notes: 'הערות',
        createdOn: 'הזמנה זו נוצרה בתאריך',
        systemName: 'מערכת ניהול ספקים',
        print: 'הדפס',
        printTitle: 'הדפס הזמנה',
        sent: 'נשלח',
        confirmed: 'אושר',
        delivered: 'נמסר'
    },
    en: {
        loading: 'Loading order details...',
        error: 'Error',
        orderNotFound: 'No order ID found in the URL. Please verify the link is correct.',
        orderNotAccessible: 'Order with this ID was not found or is not publicly accessible.',
        fetchError: 'Error retrieving order details.',
        permissionNote: 'Note: For the public link to work, public read permissions must be set for orders.',
        permissionInstructions: 'Go to Dashboard > Data > Click on Order > Settings > and change Who can view records? to Anyone (public read).',
        orderNumber: 'Order #',
        supplier: 'Supplier:',
        status: 'Status:',
        businessDetails: 'Ordering Business Details',
        businessName: 'Business Name',
        deliveryAddress: 'Delivery Address',
        deliveryDate: 'Requested Delivery Date:',
        itemsList: 'Items List',
        itemName: 'Item Name',
        quantity: 'Quantity',
        unit: 'Unit',
        notes: 'Notes',
        createdOn: 'This order was created on',
        systemName: 'Supplier Management System',
        print: 'Print',
        printTitle: 'Print Order',
        sent: 'Sent',
        confirmed: 'Confirmed',
        delivered: 'Delivered'
    },
    de: {
        loading: 'Bestelldetails werden geladen...',
        error: 'Fehler',
        orderNotFound: 'Keine Bestell-ID in der URL gefunden. Bitte überprüfen Sie, ob der Link korrekt ist.',
        orderNotAccessible: 'Bestellung mit dieser ID wurde nicht gefunden oder ist nicht öffentlich zugänglich.',
        fetchError: 'Fehler beim Abrufen der Bestelldetails.',
        permissionNote: 'Hinweis: Damit der öffentliche Link funktioniert, müssen öffentliche Leseberechtigungen für Bestellungen eingestellt werden.',
        permissionInstructions: 'Gehen Sie zu Dashboard > Data > Klicken Sie auf Order > Settings > und ändern Sie Who can view records? zu Anyone (public read).',
        orderNumber: 'Bestellung #',
        supplier: 'Lieferant:',
        status: 'Status:',
        businessDetails: 'Details des bestellenden Unternehmens',
        businessName: 'Firmenname',
        deliveryAddress: 'Lieferadresse',
        deliveryDate: 'Gewünschtes Lieferdatum:',
        itemsList: 'Artikelliste',
        itemName: 'Artikelname',
        quantity: 'Menge',
        unit: 'Einheit',
        notes: 'Notizen',
        createdOn: 'Diese Bestellung wurde erstellt am',
        systemName: 'Lieferanten-Management-System',
        print: 'Drucken',
        printTitle: 'Bestellung drucken',
        sent: 'Gesendet',
        confirmed: 'Bestätigt',
        delivered: 'Geliefert'
    },
    ru: {
        loading: 'Загрузка деталей заказа...',
        error: 'Ошибка',
        orderNotFound: 'ID заказа не найден в URL. Пожалуйста, проверьте ссылку.',
        orderNotAccessible: 'Заказ с этим ID не найден или не доступен для публичного просмотра.',
        fetchError: 'Ошибка при получении деталей заказа.',
        permissionNote: 'Примечание: для работы публичной ссылки необходимо установить права на публичное чтение для заказов.',
        permissionInstructions: 'Перейдите в Dashboard > Data > Нажмите на Order > Settings > и измените Who can view records? на Anyone (public read).',
        orderNumber: 'Заказ #',
        supplier: 'Поставщик:',
        status: 'Статус:',
        businessDetails: 'Детали заказчика',
        businessName: 'Название бизнеса',
        deliveryAddress: 'Адрес доставки',
        deliveryDate: 'Запрошенная дата доставки:',
        itemsList: 'Список товаров',
        itemName: 'Название товара',
        quantity: 'Количество',
        unit: 'Единица',
        notes: 'Примечания',
        createdOn: 'Этот заказ был создан',
        systemName: 'Система управления поставщиками',
        print: 'Печать',
        printTitle: 'Распечатать заказ',
        sent: 'Отправлено',
        confirmed: 'Подтверждено',
        delivered: 'Доставлено'
    }
};

export default function OrderDetailsPage() {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorType, setErrorType] = useState(null); 
    const [language, setLanguage] = useState('he');
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);

    const t = translations[language];
    const isRTL = language === 'he';

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const orderId = urlParams.get('id');

                if (!orderId) {
                    setErrorType('orderNotFound');
                    setLoading(false);
                    return;
                }

                console.log('[OrderDetails] Fetching order via public function:', orderId);

                // Fetch order via direct fetch to backend function (truly public, no SDK/auth required)
                const appId = 'smartplatebasic';
                const functionUrl = `https://app.base44.com/api/apps/${appId}/functions/getPublicOrder`;
                const response = await fetch(functionUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ orderId })
                });
                
                const data = await response.json();
                
                if (!response.ok || !data.order) {
                    setErrorType('orderNotAccessible');
                    setLoading(false);
                    return;
                }

                console.log('[OrderDetails] Order loaded successfully');
                setOrder(data.order);
                document.body.style.margin = '0';
                document.body.style.padding = '0';
                
            } catch (err) {
                console.error("[OrderDetails] Error fetching order:", err);
                setErrorType('orderNotAccessible');
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, []);

    useEffect(() => {
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
        
        if (order) {
            document.title = `${t.orderNumber}${order.order_number} - ${order.restaurant_name}`;
        } else if (errorType) {
            document.title = `${t.error} - ${t[errorType]}`;
        } else {
            document.title = t.loading;
        }
    }, [language, isRTL, order, errorType, t]);

    const handlePrint = () => {
        window.print();
    };

    const handleLanguageChange = (newLanguage) => {
        setLanguage(newLanguage);
        setShowLanguageMenu(false);
    };

    const getCurrentError = () => {
        if (!errorType) return null;
        return t[errorType];
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f9fafb',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                direction: isRTL ? 'rtl' : 'ltr',
                margin: 0,
                padding: 0
            }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader style={{ width: '48px', height: '48px', color: '#2563eb', animation: 'spin 1s linear infinite' }} />
                    <p style={{ marginTop: '16px', fontSize: '18px', color: '#374151' }}>{t.loading}</p>
                </div>
            </div>
        );
    }

    if (errorType) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f9fafb',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                direction: isRTL ? 'rtl' : 'ltr',
                margin: 0,
                padding: 0
            }}>
                <div style={{ textAlign: 'center', padding: '16px', maxWidth: '600px' }}>
                    <AlertCircle style={{ width: '48px', height: '48px', color: '#dc2626', margin: '0 auto 16px' }} />
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', marginBottom: '8px' }}>{t.error}</h1>
                    <p style={{ fontSize: '18px', color: '#374151', marginBottom: '24px' }}>{getCurrentError()}</p>
                    
                    {errorType === 'fetchError' && (
                        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '2px solid #fde68a', textAlign: isRTL ? 'right' : 'left' }}>
                            <p style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '12px', fontSize: '16px' }}>
                                ⚠️ {t.permissionNote}
                            </p>
                            <p style={{ marginTop: '8px', color: '#b45309', fontSize: '14px', lineHeight: '1.6' }}>
                                {t.permissionInstructions}
                            </p>
                            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '6px', border: '1px solid #fbbf24' }}>
                                <p style={{ fontSize: '13px', color: '#78350f', margin: 0 }}>
                                    <strong>Dashboard</strong> → <strong>Data</strong> → <strong>Order</strong> → <strong>Settings</strong> → <strong>Who can view records?</strong> → <strong>Anyone</strong>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    if (!order) {
        return null;
    }

    const statusLabels = {
        sent: { label: t.sent, color: "#3b82f6" },
        confirmed: { label: t.confirmed, color: "#10b981" },
        delivered: { label: t.delivered, color: "#8b5cf6" }
    };

    const statusInfo = statusLabels[order.status] || { label: order.status, color: "#6b7280" };

    return (
        <>
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-content, #printable-content * {
                        visibility: visible;
                    }
                    #printable-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        right: 0;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 20px !important;
                        background: white !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-header {
                        background: #2563eb !important;
                        color: white !important;
                        padding: 20px !important;
                        text-align: center !important;
                        margin-bottom: 20px !important;
                        border-radius: 8px !important;
                    }
                    .print-section {
                        margin-bottom: 20px !important;
                        padding: 15px !important;
                        border: 1px solid #e5e7eb !important;
                        border-radius: 8px !important;
                        break-inside: avoid;
                    }
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-top: 10px !important;
                    }
                    th, td {
                        padding: 8px !important;
                        border: 1px solid #e5e7eb !important;
                        text-align: ${isRTL ? 'right' : 'left'} !important;
                        font-size: 12px !important;
                    }
                    th {
                        background-color: #f9fafb !important;
                        font-weight: bold !important;
                    }
                }
                
                .floating-button {
                    position: fixed;
                    background: #2563eb;
                    color: white;
                    border: none;
                    border-radius: 50px;
                    padding: 15px 20px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.3s ease;
                }
                
                .floating-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
                }

                .print-button {
                    bottom: 20px;
                    right: 20px;
                }
                
                .print-button:hover {
                    background: #1d4ed8;
                }

                .language-button {
                    top: 20px; 
                    left: 20px;
                    background: #dc2626;
                    padding: 12px;
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    justify-content: center;
                }

                .language-button:hover {
                    background: #b91c1c;
                }

                .language-menu {
                    position: fixed;
                    top: 20px; 
                    left: 80px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                    z-index: 1001;
                    overflow: hidden;
                    min-width: 120px;
                }

                .language-option {
                    padding: 12px 16px;
                    cursor: pointer;
                    border: none;
                    background: transparent;
                    width: 100%;
                    text-align: left;
                    font-size: 14px;
                    transition: background-color 0.2s;
                }

                .language-option:hover {
                    background: #f3f4f6;
                }

                .language-option.active {
                    background: #dbeafe;
                    color: #1d4ed8;
                    font-weight: bold;
                }
                
                @media (max-width: 640px) {
                    .floating-button {
                        padding: 12px 16px;
                        font-size: 14px;
                    }
                    .print-button {
                        bottom: 15px;
                        right: 15px;
                    }
                    .language-button {
                        top: 15px; 
                        left: 15px;
                        padding: 10px;
                        width: 45px;
                        height: 45px;
                    }
                    .language-menu {
                        top: 15px; 
                        left: 70px;
                    }
                }
            `}</style>
            
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                padding: '16px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                direction: isRTL ? 'rtl' : 'ltr',
                margin: 0
            }}>
                <div id="printable-content" style={{
                    maxWidth: '800px',
                    margin: '0 auto',
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    overflow: 'hidden'
                }}>
                    {/* Header */}
                    <div className="print-header" style={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        color: 'white',
                        padding: '32px',
                        textAlign: 'center'
                    }}>
                        <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                            {t.orderNumber}{order.order_number}
                        </h1>
                        <p style={{ fontSize: '18px', opacity: 0.9, margin: '0' }}>
                            {t.supplier} {order.supplier_name}
                        </p>
                        <div style={{
                            display: 'inline-block',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            marginTop: '16px',
                            fontSize: '14px',
                            fontWeight: '600'
                        }}>
                            {t.status} {statusInfo.label}
                        </div>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '32px' }}>
                        {/* Business Info */}
                        <div className="print-section" style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '12px',
                            padding: '24px',
                            marginBottom: '24px',
                            border: '2px solid #e2e8f0'
                        }}>
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: 'bold',
                                color: '#1e293b',
                                margin: '0 0 16px 0',
                                paddingBottom: '8px',
                                borderBottom: '2px solid #cbd5e1'
                            }}>
                                {t.businessDetails}
                            </h2>
                            
                            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <Building style={{ width: '20px', height: '20px', color: '#64748b', marginTop: '2px' }} />
                                <div>
                                    <p style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: '0' }}>
                                        {order.restaurant_name}
                                    </p>
                                    <p style={{ fontSize: '14px', color: '#64748b', margin: '0' }}>{t.businessName}</p>
                                </div>
                            </div>
                            
                            {order.restaurant_address && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    <MapPin style={{ width: '20px', height: '20px', color: '#64748b', marginTop: '2px' }} />
                                    <div>
                                        <p style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: '0' }}>
                                            {order.restaurant_address}
                                        </p>
                                        <p style={{ fontSize: '14px', color: '#64748b', margin: '0' }}>{t.deliveryAddress}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Delivery Date */}
                        {order.delivery_date && (
                            <div className="print-section" style={{
                                backgroundColor: '#fef3c7',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '24px',
                                border: '2px solid #fbbf24'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Calendar style={{ width: '20px', height: '20px', color: '#d97706' }} />
                                    <div>
                                        <p style={{ fontSize: '16px', fontWeight: '600', color: '#92400e', margin: '0' }}>
                                            {t.deliveryDate} {new Date(order.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : language === 'de' ? 'de-DE' : language === 'ru' ? 'ru-RU' : 'en-US')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Items List */}
                        <div className="print-section" style={{
                            backgroundColor: '#f0fdf4',
                            borderRadius: '12px',
                            padding: '24px',
                            marginBottom: '24px',
                            border: '2px solid #22c55e'
                        }}>
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: 'bold',
                                color: '#15803d',
                                margin: '0 0 16px 0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <ClipboardList style={{ width: '24px', height: '24px' }} />
                                {t.itemsList}
                            </h2>
                            
                            <div style={{
                                backgroundColor: 'white',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1px solid #e5e7eb'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f9fafb' }}>
                                            <th style={{ padding: '12px', textAlign: isRTL ? 'right' : 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>#</th>
                                            <th style={{ padding: '12px', textAlign: isRTL ? 'right' : 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{t.itemName}</th>
                                            <th style={{ padding: '12px', textAlign: isRTL ? 'right' : 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{t.quantity}</th>
                                            <th style={{ padding: '12px', textAlign: isRTL ? 'right' : 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{t.unit}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.items && order.items.map((item, index) => (
                                            <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                                                <td style={{ padding: '12px', fontSize: '16px', borderBottom: index === order.items.length - 1 ? 'none' : '1px solid #e5e7eb' }}>
                                                    {index + 1}
                                                </td>
                                                <td style={{ padding: '12px', fontSize: '16px', fontWeight: '500', borderBottom: index === order.items.length - 1 ? 'none' : '1px solid #e5e7eb' }}>
                                                    {item.item_name}
                                                </td>
                                                <td style={{ padding: '12px', fontSize: '16px', fontWeight: '600', color: '#059669', borderBottom: index === order.items.length - 1 ? 'none' : '1px solid #e5e7eb' }}>
                                                    {item.quantity}
                                                </td>
                                                <td style={{ padding: '12px', fontSize: '16px', borderBottom: index === order.items.length - 1 ? 'none' : '1px solid #e5e7eb' }}>
                                                    {item.unit}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Notes */}
                        {order.notes && (
                            <div className="print-section" style={{
                                backgroundColor: '#fef7cd',
                                borderRadius: '12px',
                                padding: '20px',
                                marginBottom: '24px',
                                border: '2px solid #f59e0b'
                            }}>
                                <h3 style={{
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    color: '#92400e',
                                    margin: '0 0 12px 0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <Book style={{ width: '20px', height: '20px' }} />
                                    {t.notes}
                                </h3>
                                <p style={{ fontSize: '16px', color: '#78350f', margin: '0', lineHeight: '1.5' }}>
                                    {order.notes}
                                </p>
                            </div>
                        )}

                        {/* Footer */}
                        <div style={{
                            textAlign: 'center',
                            paddingTop: '24px',
                            borderTop: '2px solid #e5e7eb',
                            color: '#6b7280'
                        }}>
                            <p style={{ fontSize: '14px', margin: '0' }}>
                                {t.createdOn} {new Date(order.created_date).toLocaleDateString(language === 'he' ? 'he-IL' : language === 'de' ? 'de-DE' : language === 'ru' ? 'ru-RU' : 'en-US')}
                            </p>
                            <p style={{ fontSize: '12px', margin: '8px 0 0 0', opacity: 0.7 }}>
                                {t.systemName}
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Floating Print Button */}
                <button 
                    className="floating-button print-button no-print"
                    onClick={handlePrint}
                    title={t.printTitle}
                >
                    <Printer style={{ width: '20px', height: '20px' }} />
                    {t.print}
                </button>

                {/* Language Switcher */}
                <button 
                    className="floating-button language-button no-print"
                    onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                    title="Change Language"
                >
                    <Globe style={{ width: '20px', height: '20px' }} />
                </button>

                {/* Language Menu */}
                {showLanguageMenu && (
                    <div className="language-menu no-print">
                        <button 
                            className={`language-option ${language === 'he' ? 'active' : ''}`}
                            onClick={() => handleLanguageChange('he')}
                        >
                            🇮🇱 עברית
                        </button>
                        <button 
                            className={`language-option ${language === 'en' ? 'active' : ''}`}
                            onClick={() => handleLanguageChange('en')}
                        >
                            🇺🇸 English
                        </button>
                        <button 
                            className={`language-option ${language === 'de' ? 'active' : ''}`}
                            onClick={() => handleLanguageChange('de')}
                        >
                            🇩🇪 Deutsch
                        </button>
                        <button 
                            className={`language-option ${language === 'ru' ? 'active' : ''}`}
                            onClick={() => handleLanguageChange('ru')}
                        >
                            🇷🇺 Русский
                        </button>
                    </div>
                )}

                {/* Click outside to close language menu */}
                {showLanguageMenu && (
                    <div 
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999
                        }}
                        onClick={() => setShowLanguageMenu(false)}
                    />
                )}
            </div>
        </>
    );
}