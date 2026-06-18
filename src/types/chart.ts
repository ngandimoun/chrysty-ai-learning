export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

export interface ChartSeries {
  key: string;
  label: string;
  color?: string;
}
