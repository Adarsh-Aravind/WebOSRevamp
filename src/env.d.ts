declare module '*.css';
declare module '*.svg' {
  const url: string;
  export default url;
}
declare module '*.png' {
  const url: string;
  export default url;
}
declare const __DEV__: boolean;
declare const __VERSION__: string;
