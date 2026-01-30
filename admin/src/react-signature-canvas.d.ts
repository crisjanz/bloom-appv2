declare module 'react-signature-canvas' {
  import * as React from 'react';

  export interface SignaturePadProps {
    canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
    penColor?: string;
    backgroundColor?: string;
    velocityFilterWeight?: number;
    minWidth?: number;
    maxWidth?: number;
    dotSize?: number;
    throttle?: number;
  }

  export default class SignaturePad extends React.Component<SignaturePadProps> {
    clear(): void;
    toDataURL(type?: string): string;
  }
}
