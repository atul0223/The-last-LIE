import React, { forwardRef, useImperativeHandle } from 'react';
import { View, type ViewProps } from 'react-native';

export interface ViewShotProps extends ViewProps {
  options?: Record<string, unknown>;
  children?: React.ReactNode;
}

export interface ViewShotRef {
  capture?: () => Promise<string>;
}

const ViewShot = forwardRef<ViewShotRef, ViewShotProps>((props, ref) => {
  useImperativeHandle(ref, () => ({
    capture: async () => 'mock-captured-uri.png',
  }));
  return <View {...props}>{props.children}</View>;
});

export const captureRef = async () => 'mock-captured-uri.png';
export default ViewShot;
