import { YEARS } from '@/lib/constants';
import { Select } from '@/components/ui/select';

interface YearRangeProps {
  idPrefix: string;
  from: string;
  to: string;
  onFromChange: (year: string) => void;
  onToChange: (year: string) => void;
}

export function YearRange({ idPrefix, from, to, onFromChange, onToChange }: YearRangeProps) {
  return (
    <>
      <Select label="From" id={`${idPrefix}-year-from`} value={from} options={YEARS} onChange={(e) => onFromChange(e.target.value)} />
      <Select label="To" id={`${idPrefix}-year-to`} value={to} options={YEARS} onChange={(e) => onToChange(e.target.value)} />
    </>
  );
}
