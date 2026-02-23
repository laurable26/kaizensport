/// <reference types="vite/client" />

// Suppress CSS module import errors
declare module '*.css' {
  const styles: Record<string, string>
  export default styles
}
