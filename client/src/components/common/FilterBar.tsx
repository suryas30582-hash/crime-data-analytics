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
    <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-4 shadow-warm-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEDFD9] pb-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-[#2B1F1D]">
          <Filter className="h-4 w-4 text-[#883A2E]" />
          <span>Searchable Intelligence Filters</span>
          {isFiltered && (
            <span className="rounded-full bg-[#883A2E]/10 px-2 py-0.5 text-[10px] font-bold text-[#883A2E] border border-[#883A2E]/25">
              Filters Active
            </span>
          )}
        </div>

        {isFiltered && (
          <button
            onClick={resetFilters}
            className="flex items-center space-x-1.5 rounded-lg border border-[#EEDFD9] bg-[#FFF7F4] px-2.5 py-1 text-xs text-[#7A6360] hover:border-[#D65A31] hover:bg-[#D65A31]/10 hover:text-[#D65A31] transition-colors"
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
            <label className="mb-1 block text-[11px] font-semibold text-[#7A6360]">
              Keyword Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#7A6360]" />
              <input
                type="text"
                placeholder={t('searchPlaceholder', 'Search ID, City, Type...')}
                value={filters.search}
                onChange={e => updateFilter('search', e.target.value)}
                className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] pl-9 pr-3 py-2 text-xs text-[#2B1F1D] placeholder-[#7A6360]/60 focus:border-[#883A2E] focus:bg-[#FFFDFC] focus:outline-none focus:ring-1 focus:ring-[#883A2E]/30"
              />
            </div>
          </div>
        )}

        {/* State Filter */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-[#7A6360]">
            {t('filterByState', 'State')}
          </label>
          <select
            value={filters.state}
            onChange={e => updateFilter('state', e.target.value)}
            disabled={isLoadingLocations}
            className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:bg-[#FFFDFC] focus:outline-none focus:ring-1 focus:ring-[#883A2E]/30"
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
          <label className="mb-1 block text-[11px] font-semibold text-[#7A6360]">
            {t('filterByDistrict', 'District')}
          </label>
          <select
            value={filters.district}
            onChange={e => updateFilter('district', e.target.value)}
            disabled={isLoadingLocations}
            className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:bg-[#FFFDFC] focus:outline-none focus:ring-1 focus:ring-[#883A2E]/30"
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
          <label className="mb-1 block text-[11px] font-semibold text-[#7A6360]">
            {t('filterByCity', 'City')}
          </label>
          <select
            value={filters.city}
            onChange={e => updateFilter('city', e.target.value)}
            disabled={isLoadingLocations}
            className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:bg-[#FFFDFC] focus:outline-none focus:ring-1 focus:ring-[#883A2E]/30"
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
          <label className="mb-1 block text-[11px] font-semibold text-[#7A6360]">
            {t('filterByYear', 'Year')}
          </label>
          <select
            value={filters.year}
            onChange={e => updateFilter('year', e.target.value)}
            className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:bg-[#FFFDFC] focus:outline-none focus:ring-1 focus:ring-[#883A2E]/30 font-mono"
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
            <label className="mb-1 block text-[11px] font-semibold text-[#7A6360]">
              {t('filterByCrimeType', 'Crime Type')}
            </label>
            <select
              value={filters.crimeType}
              onChange={e => updateFilter('crimeType', e.target.value)}
              className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:bg-[#FFFDFC] focus:outline-none focus:ring-1 focus:ring-[#883A2E]/30"
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
            <label className="mb-1 block text-[11px] font-semibold text-[#7A6360]">
              Case Status
            </label>
            <select
              value={filters.caseStatus}
              onChange={e => updateFilter('caseStatus', e.target.value)}
              className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:bg-[#FFFDFC] focus:outline-none focus:ring-1 focus:ring-[#883A2E]/30"
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
            <label className="mb-1 block text-[11px] font-semibold text-[#7A6360]">
              Severity Level
            </label>
            <select
              value={filters.severity}
              onChange={e => updateFilter('severity', e.target.value)}
              className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3 py-2 text-xs text-[#2B1F1D] focus:border-[#883A2E] focus:bg-[#FFFDFC] focus:outline-none focus:ring-1 focus:ring-[#883A2E]/30"
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
