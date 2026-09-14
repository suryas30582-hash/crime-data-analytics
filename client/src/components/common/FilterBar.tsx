import React from 'react';
import { RotateCcw, Search, Filter, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';
import { useLanguage } from '../../context/LanguageContext';

interface FilterBarProps {
  showSearch?: boolean;
  showCrimeType?: boolean;
  showSeverity?: boolean;
  showStatus?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  showSearch = true,
  showCrimeType = true,
  showSeverity = false,
  showStatus = false
}) => {
  const {
    filters,
    updateFilter,
    resetFilters,
    availableStates,
    availableDistricts,
    availableCities,
    availableYears,
    availableCrimeTypes,
    isLoadingLocations
  } = useDataset();

  const { t } = useLanguage();

  const isFiltered =
    filters.state !== 'All' ||
    filters.district !== 'All' ||
    filters.city !== 'All' ||
    filters.year !== 'All' ||
    filters.crimeType !== 'All' ||
    filters.caseStatus !== 'All' ||
    filters.severity !== 'All' ||
    filters.search !== '';

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0c1326]/80 p-4 backdrop-blur-xl shadow-lg shadow-black/20 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
          <Filter className="h-4 w-4 text-cyan-400" />
          <span>Searchable Intelligence Filters</span>
          {isFiltered && (
            <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/30">
              Filters Active
            </span>
          )}
        </div>

        {isFiltered && (
          <button
            onClick={resetFilters}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 hover:border-rose-500/40 hover:bg-rose-950/30 hover:text-rose-300 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>{t('resetFilters', 'Reset Filters')}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {/* Search Bar */}
        {showSearch && (
          <div className="col-span-1 sm:col-span-2 md:col-span-1">
            <label className="mb-1 block text-[11px] font-medium text-slate-400">
              Keyword Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder={t('searchPlaceholder', 'Search ID, City, Type...')}
                value={filters.search}
                onChange={e => updateFilter('search', e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>
          </div>
        )}

        {/* State Filter */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-400">
            {t('filterByState', 'State')}
          </label>
          <select
            value={filters.state}
            onChange={e => updateFilter('state', e.target.value)}
            disabled={isLoadingLocations}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          >
            <option value="All">{t('allStates', 'All States / UTs')}</option>
            {availableStates.map(st => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* District Filter */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-400">
            {t('filterByDistrict', 'District')}
          </label>
          <select
            value={filters.district}
            onChange={e => updateFilter('district', e.target.value)}
            disabled={isLoadingLocations}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          >
            <option value="All">{t('allDistricts', 'All Districts')}</option>
            {availableDistricts.map(dist => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
        </div>

        {/* City Filter */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-400">
            {t('filterByCity', 'City')}
          </label>
          <select
            value={filters.city}
            onChange={e => updateFilter('city', e.target.value)}
            disabled={isLoadingLocations}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          >
            <option value="All">{t('allCities', 'All Cities')}</option>
            {availableCities.map(city => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Year Filter */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-400">
            {t('filterByYear', 'Year')}
          </label>
          <select
            value={filters.year}
            onChange={e => updateFilter('year', e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 font-mono"
          >
            <option value="All">{t('allYears', 'All Years')}</option>
            {availableYears.map(yr => (
              <option key={yr} value={String(yr)}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        {/* Crime Type Filter */}
        {showCrimeType && (
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-400">
              {t('filterByCrimeType', 'Crime Type')}
            </label>
            <select
              value={filters.crimeType}
              onChange={e => updateFilter('crimeType', e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            >
              <option value="All">{t('allTypes', 'All Types')}</option>
              {availableCrimeTypes.map(ct => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Case Status Filter */}
        {showStatus && (
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-400">
              Case Status
            </label>
            <select
              value={filters.caseStatus}
              onChange={e => updateFilter('caseStatus', e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            >
              <option value="All">{t('allStatuses', 'All Case Statuses')}</option>
              <option value="Closed">Closed</option>
              <option value="Solved">Solved</option>
              <option value="Under Investigation">Under Investigation</option>
              <option value="Pending">Pending</option>
              <option value="Unsolved">Unsolved</option>
              <option value="Charge Sheet Filed">Charge Sheet Filed</option>
            </select>
          </div>
        )}

        {/* Crime Severity Filter */}
        {showSeverity && (
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-400">
              Severity Level
            </label>
            <select
              value={filters.severity}
              onChange={e => updateFilter('severity', e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            >
              <option value="All">{t('allSeverities', 'All Severities')}</option>
              <option value="High">High Severity</option>
              <option value="Medium">Medium Severity</option>
              <option value="Low">Low Severity</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
