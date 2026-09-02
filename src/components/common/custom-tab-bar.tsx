import React from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { AppBottomNav, type AppBottomNavKey } from './app-bottom-nav';

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const currentRouteName = state.routes[state.index]?.name as AppBottomNavKey | undefined;

  return (
    <AppBottomNav
      activeKey={currentRouteName}
      onNavigate={(key) => navigation.navigate(key)}
    />
  );
};
