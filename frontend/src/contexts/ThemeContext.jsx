import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
 const context = useContext(ThemeContext);
 if (!context) {
 throw new Error('useTheme must be used within a ThemeProvider');
 }
 return context;
};

export const ThemeProvider = ({ children }) => {
 const [isDark, setIsDark] = useState(() => {
 // Controlla se c'è una preferenza salvata
 const saved = localStorage.getItem('laba-theme');
 if (saved) {
 return saved === 'dark';
 }
 // Altrimenti usa la preferenza del sistema
 return window.matchMedia('(prefers-color-scheme: dark)').matches;
 });

 useEffect(() => {
 // Salva la preferenza
 localStorage.setItem('laba-theme', isDark ? 'dark' : 'light');
 
 // Applica la classe al body
 if (isDark) {
 document.documentElement.classList.add('dark');
 } else {
 document.documentElement.classList.remove('dark');
 }
 }, [isDark]);

 const toggleTheme = () => {
 setIsDark(!isDark);
 };

 const value = {
 isDark,
 toggleTheme,
 theme: isDark ? 'dark' : 'light'
 };

 return (
 <ThemeContext.Provider value={value}>
 {children}
 </ThemeContext.Provider>
 );
};



