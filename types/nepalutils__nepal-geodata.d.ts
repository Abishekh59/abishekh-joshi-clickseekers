declare module '@nepalutils/nepal-geodata' {
  const nepalGeoData: (type: 'english' | 'devnagari') => Promise<any>;
  export default nepalGeoData;
}
