export const LABOUR_TYPE_OPTIONS = [
  { value: 'FIRST HOUR', label: 'First hour' },
  { value: 'ADDITIONAL HOUR', label: 'Additional hour' },
  { value: 'SECOND LABOUR', label: 'Second labour' },
  { value: 'CUSTOM', label: 'Custom' },
];

const TYPE_LABELS = LABOUR_TYPE_OPTIONS.reduce((acc, { value, label }) => {
  acc[value] = label;
  return acc;
}, {});

export function defaultLabourLine() {
  return { notes: '', type: 'FIRST HOUR', customTypeLabel: '', hrs: 1, rate: 0 };
}

export function formatLabourTypeDisplay(lab) {
  if (!lab) return '';
  if (lab.type === 'CUSTOM') {
    const t = lab.customTypeLabel && String(lab.customTypeLabel).trim();
    return t || '—';
  }
  return TYPE_LABELS[lab.type] || lab.type || '';
}
