import { useThemeStore } from '../stores/themeStore';

export const useChartTheme = () => {
  const theme = useThemeStore((state) => state.theme);

  if (theme === 'dark') {
    return {
      grid: '#374151',
      axis: '#9ca3af',
      tooltipBg: '#1a1f2e',
      tooltipBorder: '#374151',
      tooltipLabel: '#e2e8f0',
    };
  }

  return {
    grid: '#e5e7eb',
    axis: '#6b7280',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e5e7eb',
    tooltipLabel: '#1e293b',
  };
};
