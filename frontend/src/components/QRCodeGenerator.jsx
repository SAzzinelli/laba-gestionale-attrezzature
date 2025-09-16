import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

const QRCodeGenerator = ({ item, onClose, embedded = false }) => {
 const [qrCodeUrl, setQrCodeUrl] = useState('');
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const generateQRCode = async () => {
 try {
 setLoading(true);
 // Crea un URL che punta all'oggetto specifico
 const qrData = `${window.location.origin}/inventario/${item.id}`;
 const url = await QRCode.toDataURL(qrData, {
 width: 256,
 margin: 2,
 color: {
 dark: '#000000',
 light: '#FFFFFF'
 }
 });
 setQrCodeUrl(url);
 } catch (error) {
 console.error('Errore nella generazione del QR code:', error);
 } finally {
 setLoading(false);
 }
 };

 if (item) {
 generateQRCode();
 }
 }, [item]);

 const downloadQRCode = () => {
 const link = document.createElement('a');
 link.download = `QR-${item.nome.replace(/\s+/g, '-')}.png`;
 link.href = qrCodeUrl;
 link.click();
 };

if (!item) return null;

// Se embedded, renderizza solo il contenuto senza modal
if (embedded) {
  return (
    <div className="text-center">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Generazione QR Code...</span>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <img src={qrCodeUrl} alt={`QR Code per ${item.nome}`} className="mx-auto" />
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Oggetto:</strong> {item.nome}</p>
            <p><strong>Seriale:</strong> {item.seriale || 'N/A'}</p>
            <p><strong>Categoria:</strong> {item.categoria_nome || `${item.categoria_madre} - ${item.categoria_figlia}`}</p>
          </div>
          <div className="flex space-x-3 mt-6">
            <button
              onClick={downloadQRCode}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Scarica QR Code
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Stampa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

return (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
 <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-semibold text-gray-900">QR Code per {item.nome}</h3>
 <button
   onClick={onClose}
 className="text-gray-400 hover:text-gray-600"
 >
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 <div className="text-center">
 {loading ? (
 <div className="flex items-center justify-center h-64">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
 </div>
 ) : (
 <div className="space-y-4">
 <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
 <img src={qrCodeUrl} alt={`QR Code per ${item.nome}`} className="w-48 h-48" />
 </div>
 
 <div className="text-sm text-gray-600">
 <p><strong>Oggetto:</strong> {item.nome}</p>
 <p><strong>Seriale:</strong> {item.seriale || 'N/A'}</p>
 <p><strong>Categoria:</strong> {item.categoria_nome || 'N/A'}</p>
 </div>

 <div className="flex space-x-3">
 <button
 onClick={downloadQRCode}
 className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
 >
 📥 Scarica QR Code
 </button>
 <button
 onClick={() => window.print()}
 className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
 >
 🖨️ Stampa
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 );
};

export default QRCodeGenerator;
