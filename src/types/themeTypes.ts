export interface ThemeParameter {
  parameterName: string;
  parameterType: string;
  communicationType: string;
  values: {
    [key: string]: string | null;
  };
}
