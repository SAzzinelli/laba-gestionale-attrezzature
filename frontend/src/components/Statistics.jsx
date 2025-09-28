import React, { useState } from 'react';
import BasicStats from './BasicStats';
import AdvancedStats from './AdvancedStats';

const Statistics = () => {
 const [activeTab, setActiveTab] = useState('basic');

 return (
  <div className="min-h-screen bg-gray-50">
    {/* Header */}
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8 mx-4 sm:mx-6 lg:mx-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Statistiche</h1>
          <p className="text-gray-600 text-lg">Analisi e monitoraggio del sistema di gestione attrezzature</p>
        </div>
      </div>
    </div>

    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Statistiche Base</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'advanced'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Statistiche Avanzate</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
        {activeTab === 'basic' && (
          <div className="p-8">
            <BasicStats />
          </div>
        )}
        
        {activeTab === 'advanced' && (
          <div className="p-8">
            <AdvancedStats />
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default Statistics;

