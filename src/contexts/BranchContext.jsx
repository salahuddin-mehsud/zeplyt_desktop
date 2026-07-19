import React, { createContext, useContext, useState, useEffect } from 'react';

const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
  const [activeBranchId, setActiveBranchId] = useState(() => {
    return localStorage.getItem('activeBranch') || '';
  });

  const setBranch = (branchId) => {
    setActiveBranchId(branchId);
    if (branchId) {
      localStorage.setItem('activeBranch', branchId);
    } else {
      localStorage.removeItem('activeBranch');
    }
    // Dispatch a global event so all pages can listen and refetch
    window.dispatchEvent(new CustomEvent('branchChanged', { detail: { branchId } }));
  };

  return (
    <BranchContext.Provider value={{ activeBranchId, setBranch }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => useContext(BranchContext);