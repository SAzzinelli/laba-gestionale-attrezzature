import React, { useState } from 'react';
import BasicStats from './BasicStats';
import AdvancedStats from './AdvancedStats';

const Statistics = () => {
 const [activeTab, setActiveTab] = useState('basic');

 return (
 <div className="min-h-screen bg-gray-50">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 {/* Header */}
 <div className="mb-8">
 <h1 className="text-3xl font-bold text-gray-900 mb-2">Statistiche</h1>
 <p className="text-lg text-gray-600">Analisi e monitoraggio del sistema di gestione attrezzature</p>
 </div>

 {/* Tabs */}
 <div className="mb-8">
 <div className="border-b border-gray-200">
 <nav className="-mb-px flex space-x-8">
 <button
 onClick={() => setActiveTab('basic')}
 className={`py-2 px-1 border-b-2 font-medium text-sm ${
 activeTab === 'basic'
 ? 'border-blue-500 text-blue-600'
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
 }`}
 >
 <div className="flex items-center space-x-2">
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
 </svg>
 <span>Statistiche Base</span>
 </div>
 </button>
 <button
 onClick={() => setActiveTab('advanced')}
 className={`py-2 px-1 border-b-2 font-medium text-sm ${
 activeTab === 'advanced'
 ? 'border-blue-500 text-blue-600'
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
 }`}
 >
 <div className="flex items-center space-x-2">
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
 </svg>
 <span>Statistiche Avanzate</span>
 </div>
 </button>
 </nav>
 </div>
 </div>

 {/* Content */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200">
 {activeTab === 'basic' && (
 <div className="p-6">
 <BasicStats />
 </div>
 )}
 
 {activeTab === 'advanced' && (
 <div className="p-6">
 <AdvancedStats />
 </div>
 )}
 </div>
 </div>
 </div>
 );
};

export default Statistics;

