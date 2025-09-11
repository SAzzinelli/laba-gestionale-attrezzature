import React from 'react';

const Footer = () => {
 return (
 <footer className="header py-6 mt-auto sticky bottom-0 z-10">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
 <div className="flex items-center space-x-2">
 <img src="/logoSito.svg" alt="LABA Logo" className="h-8 w-auto" />
 <div>
 <h3 className="text-sm font-semibold text-primary">Gestione Attrezzature</h3>
 <p className="text-xs text-tertiary">Sistema di gestione inventario e prestiti</p>
 </div>
 </div>
 
 <div className="flex items-center space-x-6">
 <div className="text-xs text-tertiary">
 <p>Versione 1.0a (build 304)</p>
 <p>© 2025 LABA Firenze</p>
 </div>
 
 <div className="flex items-center space-x-4">
 <div className="flex items-center space-x-1 text-xs text-tertiary">
 <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
 <span>Sistema Online</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </footer>
 );
};

export default Footer;