import type { BrewingMethod } from '@/lib/api/types';

/** Brewing methods offered in brew selection and session filters, in display order. */
export const BREWING_METHODS: readonly { value: BrewingMethod; label: string }[] = [
  { value: 'V60', label: 'V60' },
  { value: 'Chemex', label: 'Chemex' },
  { value: 'FrenchPress', label: 'French Press' },
  { value: 'AeroPress', label: 'AeroPress' },
  { value: 'Espresso', label: 'Espresso' },
  { value: 'Moka', label: 'Moka Pot' },
  { value: 'ColdBrew', label: 'Cold Brew' },
  { value: 'Other', label: 'Other' },
] as const;

