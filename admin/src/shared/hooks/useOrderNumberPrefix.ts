import { useOrderSettings } from '@app/contexts/OrderSettingsContext';

export function useOrderNumberPrefix(): string {
  return useOrderSettings().orderNumberPrefix;
}

export default useOrderNumberPrefix;
