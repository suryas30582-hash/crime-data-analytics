import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Dataset, FilterState } from '../types';
import { api } from '../services/api';

interface DatasetContextType {
  datasets: Dataset[];
  activeDatasetId: string;
  activeDataset: Dataset | null;
  setActiveDatasetId: (id: string) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  updateFilter: (key: keyof FilterState, value: string) => void;
  resetFilters: () => void;
  availableStates: string[];
  availableDistricts: string[];
  availableCities: string[];
  availableYears: number[];
  availableCrimeTypes: string[];
  isLoadingLocations: boolean;
  refreshDatasets: () => Promise<void>;
}

const initialFilters: FilterState = {
  datasetId: 'ds_india_all',
  state: 'All',
  district: 'All',
  city: 'All',
  year: 'All',
  crimeType: 'All',
  caseStatus: 'All',
  severity: 'All',
  arrestMade: 'All',
  search: ''
};

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export const DatasetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDatasetId, setActiveDatasetIdState] = useState<string>(() => {
    return localStorage.getItem('crime_active_dataset_id') || 'ds_india_all';
  });
  const [filters, setFilters] = useState<FilterState>(() => {
    const savedId = localStorage.getItem('crime_active_dataset_id') || 'ds_india_all';
    return {
      ...initialFilters,
      datasetId: savedId
    };
  });

  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableCrimeTypes, setAvailableCrimeTypes] = useState<string[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState<boolean>(false);

  const loadDatasets = useCallback(async () => {
    try {
      const res = await api.getDatasets();
      setDatasets(res.datasets);
      if (res.datasets.length > 0) {
        const savedId = localStorage.getItem('crime_active_dataset_id') || activeDatasetId;
        const exists = res.datasets.some(d => d.id === savedId);
        const targetId = exists ? savedId : res.datasets[0].id;
        if (targetId !== activeDatasetId) {
          setActiveDatasetIdState(targetId);
          setFilters(prev => ({ ...prev, datasetId: targetId }));
        }
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    }
  }, [activeDatasetId]);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  const setActiveDatasetId = (id: string) => {
    try {
      localStorage.setItem('crime_active_dataset_id', id);
    } catch (e) {
      // Ignore storage errors
    }
    setActiveDatasetIdState(id);
    setFilters({
      ...initialFilters,
      datasetId: id
    });
  };

  // Load Available Years for the active dataset
  useEffect(() => {
    async function loadYears() {
      if (!activeDatasetId) return;
      try {
        const res = await api.getAvailableYears(activeDatasetId);
        setAvailableYears(res.years);
      } catch (err) {
        console.error('Failed to load available years:', err);
      }
    }
    loadYears();
  }, [activeDatasetId]);

  // Load Location Hierarchy when dataset, state, or district changes
  useEffect(() => {
    async function loadLocations() {
      if (!activeDatasetId) return;
      setIsLoadingLocations(true);
      try {
        const res = await api.getLocationHierarchy(
          activeDatasetId,
          filters.state !== 'All' ? filters.state : undefined,
          filters.district !== 'All' ? filters.district : undefined
        );
        setAvailableStates(res.states);
        setAvailableDistricts(res.districts);
        setAvailableCities(res.cities);
        setAvailableCrimeTypes(res.crimeTypes);
      } catch (err) {
        console.error('Failed to load location hierarchy:', err);
      } finally {
        setIsLoadingLocations(false);
      }
    }
    loadLocations();
  }, [activeDatasetId, filters.state, filters.district]);

  // Cascading Filter Reset Logic
  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => {
      const updated = { ...prev, [key]: value };

      // Changing State resets District and City
      if (key === 'state') {
        updated.district = 'All';
        updated.city = 'All';
      }

      // Changing District resets City
      if (key === 'district') {
        updated.city = 'All';
      }

      return updated;
    });
  };

  const resetFilters = () => {
    setFilters({
      ...initialFilters,
      datasetId: activeDatasetId
    });
  };

  const activeDataset = datasets.find(d => d.id === activeDatasetId) || null;

  return (
    <DatasetContext.Provider
      value={{
        datasets,
        activeDatasetId,
        activeDataset,
        setActiveDatasetId,
        filters,
        setFilters,
        updateFilter,
        resetFilters,
        availableStates,
        availableDistricts,
        availableCities,
        availableYears,
        availableCrimeTypes,
        isLoadingLocations,
        refreshDatasets: loadDatasets
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
};

export function useDataset() {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
}
