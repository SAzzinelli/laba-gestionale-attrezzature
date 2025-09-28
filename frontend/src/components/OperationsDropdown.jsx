import React, { useState, useRef, useEffect } from 'react';

const OperationsDropdown = ({ onExport, onTemplate, onImport }) => {
 const [isOpen, setIsOpen] = useState(false);
 const dropdownRef = useRef(null);

 useEffect(() => {
 const handleClickOutside = (event) => {
 if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
 setIsOpen(false);
 }
 };

 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 return (
 <div className="relative" ref={dropdownRef}>
 <button
 onClick={() => setIsOpen(!isOpen)}
 className="btn-secondary flex items-center h-12"
 >
 <svg className="icon-sm mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
 </svg>
 Altre Operazioni
 <svg className={`icon-sm ml-1 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
 </svg>
 </button>

 {isOpen && (
 <div className="absolute right-0 top-full mt-2 w-48 bg-primary border border-primary rounded-lg shadow-xl z-50 overflow-hidden">
 <button
 onClick={() => {
 onExport();
 setIsOpen(false);
 }}
 className="w-full px-4 py-3 text-left text-secondary hover:bg-tertiary transition-colors flex items-center"
 >
 <svg className="icon-sm mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
 </svg>
 <div>
 <p className="font-medium">Esporta Excel</p>
 <p className="text-xs text-tertiary">Scarica inventario completo</p>
 </div>
 </button>
 
 <button
 onClick={() => {
 onTemplate();
 setIsOpen(false);
 }}
 className="w-full px-4 py-3 text-left text-secondary hover:bg-tertiary transition-colors flex items-center"
 >
 <svg className="icon-sm mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
 </svg>
 <div>
 <p className="font-medium">Template Import</p>
 <p className="text-xs text-tertiary">Scarica template vuoto</p>
 </div>
 </button>
 
 <label className="w-full px-4 py-3 text-left text-secondary hover:bg-tertiary transition-colors flex items-center cursor-pointer">
 <svg className="icon-sm mr-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
 </svg>
 <div>
 <p className="font-medium">Importa Excel</p>
 <p className="text-xs text-tertiary">Carica file esistente</p>
 </div>
 <input
 type="file"
 accept=".xlsx,.xls"
 onChange={(e) => {
 const file = e.target.files[0];
 if (file) {
   onImport(file);
 }
 setIsOpen(false);
 }}
 className="hidden"
 />
 </label>
 </div>
 )}
 </div>
 );
};

export default OperationsDropdown;
