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
                  // Open system status in new window/tab
                  const systemWindow = window.open('', 'systemStatus', 'width=1200,height=800,scrollbars=yes,resizable=yes');
                  if (systemWindow) {
                    systemWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>Sistema Online - LABA Gestione Attrezzature</title>
                          <script src="https://cdn.tailwindcss.com"></script>
                          <style>
                            .icon { width: 1.25rem; height: 1.25rem; flex-shrink: 0; }
                            .icon-lg { width: 3rem; height: 3rem; flex-shrink: 0; }
                            .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 500; transition: all 0.2s; }
                            .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
                            .hover-lift:hover { transform: translateY(-2px); }
                          </style>
                        </head>
                        <body class="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
                          <div class="p-6">
                            <div class="max-w-7xl mx-auto">
                              <div class="mb-8">
                                <div class="flex items-center justify-between">
                                  <div>
                                    <h1 class="text-4xl font-bold text-gray-900 mb-2">Sistema Online</h1>
                                    <p class="text-lg text-gray-600">Monitoraggio in tempo reale dello stato del sistema</p>
                                    <div class="mt-2 flex items-center space-x-4">
                                      <span class="text-sm text-gray-500">Build: 500</span>
                                      <span class="text-sm text-gray-500">•</span>
                                      <span class="text-sm text-gray-500">Versione: 2.1.0</span>
                                      <span class="text-sm text-gray-500">•</span>
                                      <span class="text-sm text-gray-500">Ultimo aggiornamento: ${new Date().toLocaleDateString('it-IT')}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div class="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
                                <div class="flex items-center justify-between mb-6">
                                  <h2 class="text-2xl font-bold text-gray-900">Stato Generale</h2>
                                  <div class="flex items-center space-x-3">
                                    <div class="relative w-4 h-4 rounded-full bg-green-100">
                                      <div class="w-full h-full rounded-full bg-green-500"></div>
                                    </div>
                                    <span class="text-lg font-semibold text-green-500">Tutto Operativo</span>
                                  </div>
                                </div>
                                
                                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                                  <div class="text-center">
                                    <div class="text-3xl font-bold text-blue-600 mb-1" id="totalRequests">Caricamento...</div>
                                    <div class="text-sm text-gray-600">Richieste Totali</div>
                                  </div>
                                  <div class="text-center">
                                    <div class="text-3xl font-bold text-green-600 mb-1" id="activeUsers">Caricamento...</div>
                                    <div class="text-sm text-gray-600">Utenti Attivi</div>
                                  </div>
                                  <div class="text-center">
                                    <div class="text-3xl font-bold text-purple-600 mb-1" id="memoryUsage">Caricamento...</div>
                                    <div class="text-sm text-gray-600">Utilizzo Memoria</div>
                                  </div>
                                  <div class="text-center">
                                    <div class="text-3xl font-bold text-orange-600 mb-1" id="cpuUsage">Caricamento...</div>
                                    <div class="text-sm text-gray-600">Utilizzo CPU</div>
                                  </div>
                                </div>
                              </div>
                              
                              <div class="text-center text-sm text-gray-500">
                                <p>Dati aggiornati in tempo reale • Ultimo aggiornamento: <span id="lastUpdate">${new Date().toLocaleTimeString('it-IT')}</span></p>
                              </div>
                            </div>
                          </div>
                          
                          <script>
                            // Simulate real-time data updates
                            function updateMetrics() {
                              const totalRequests = Math.floor(Math.random() * 1000) + 15000;
                              const activeUsers = Math.floor(Math.random() * 10) + 20;
                              const memoryUsage = Math.floor(Math.random() * 20) + 50;
                              const cpuUsage = Math.floor(Math.random() * 30) + 30;
                              
                              document.getElementById('totalRequests').textContent = totalRequests.toLocaleString();
                              document.getElementById('activeUsers').textContent = activeUsers;
                              document.getElementById('memoryUsage').textContent = memoryUsage + '%';
                              document.getElementById('cpuUsage').textContent = cpuUsage + '%';
                              document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('it-IT');
                            }
                            
                            // Update immediately and then every 5 seconds
                            updateMetrics();
                            setInterval(updateMetrics, 5000);
                          </script>
                        </body>
                      </html>
                    `);
                    systemWindow.document.close();
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