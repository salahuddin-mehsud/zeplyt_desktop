import { useEffect, useState, useCallback } from 'react';
import { useBranch } from '../contexts/BranchContext';

export const useBranchData = (fetchFunction, dependencies = []) => {
  const { activeBranchId } = useBranch();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFunction(activeBranchId);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, activeBranchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for global branch change events
  useEffect(() => {
    const handleBranchChange = () => {
      fetchData();
    };
    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};