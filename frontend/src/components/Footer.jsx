import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <img src="/logoSito.svg" alt="LABA Logo" className="h-8 w-auto" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Gestione Attrezzature</h3>
              <p className="text-xs text-gray-600">Sistema di gestione inventario e prestiti</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="text-xs text-gray-600">
              <p>Versione 2.1.0 (build 500)</p>
              <p>© 2025 LABA Firenze</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => {
                  // Check if admin sidebar exists (admin area)
                  const adminSidebar = document.querySelector('.sidebar');
                  console.log('Footer click - adminSidebar found:', !!adminSidebar);
                  
                  if (adminSidebar) {
                    // Admin area - switch to sistema tab
                    console.log('Dispatching navigateToSystemAdmin event');
                    const event = new CustomEvent('navigateToSystemAdmin');
                    window.dispatchEvent(event);
                  } else {
                    // User area - switch to sistema view
                    console.log('Dispatching navigateToSystem event');
                    const event = new CustomEvent('navigateToSystem');
                    window.dispatchEvent(event);
                  }
                }}
                className="flex items-center space-x-1 text-xs text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
              >
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Sistema Online</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;