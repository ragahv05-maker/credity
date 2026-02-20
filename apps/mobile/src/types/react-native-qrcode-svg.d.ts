declare module 'react-native-qrcode-svg' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  interface QRCodeProps {
    value: string;
    size?: number;
    color?: string;
    backgroundColor?: string;
    logo?: object;
    logoSize?: number;
    logoBorderRadius?: number;
    logoBackgroundColor?: string;
    logoMargin?: number;
    ecl?: 'L' | 'M' | 'Q' | 'H';
    enableLinearGradient?: boolean;
    linearGradient?: string[];
    gradientDirection?: string[];
    quietZone?: number;
    style?: ViewStyle;
    getRef?: (ref: any) => void;
    onError?: (error: Error) => void;
  }

  export default class QRCode extends Component<QRCodeProps> {}
}
