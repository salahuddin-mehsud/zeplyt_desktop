import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useBranch } from '../contexts/BranchContext';

const symbols = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  PKR: 'PKR',
  INR: '₹',
  BHD: 'BHD',
  SAR: 'SAR',
  AED: 'AED',
  KWD: 'KWD',
  CAD: 'C$',
  AUD: 'A$',
};

export const currencySymbolFor = (currency = 'USD') => symbols[currency] || currency;

export default function useCurrency() {
  const { activeBranchId } = useBranch() || {};
  const [currency, setCurrency] = useState('USD');

  const fetchCurrency = useCallback(() => {
    api.get('/dashboard/settings/operating-hours')
      .then((res) => setCurrency(res.data.settings?.currency || 'USD'))
      .catch(() => setCurrency('USD'));
  }, [activeBranchId]);

  useEffect(() => {
    fetchCurrency();
  }, [fetchCurrency]);

  useEffect(() => {
    const handleBranchOrCurrencyChange = () => {
      fetchCurrency();
    };

    window.addEventListener('branchChanged', handleBranchOrCurrencyChange);
    window.addEventListener('currencyChanged', handleBranchOrCurrencyChange);

    return () => {
      window.removeEventListener('branchChanged', handleBranchOrCurrencyChange);
      window.removeEventListener('currencyChanged', handleBranchOrCurrencyChange);
    };
  }, [fetchCurrency]);

  return { currency, currencySymbol: currencySymbolFor(currency), refetchCurrency: fetchCurrency };
}
