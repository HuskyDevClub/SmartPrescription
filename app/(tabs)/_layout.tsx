import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
    const colorScheme = useColorScheme();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
                headerShown: false,
                tabBarStyle: Platform.select({
                    ios: {
                        // Use a transparent background on iOS to show the blur effect
                        position: 'absolute',
                    },
                    default: {},
                }),
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({color}: any) => <MaterialIcons size={28} name="home" color={color}/>,
                }}
            />
            <Tabs.Screen
                name="agenda"
                options={{
                    title: 'Calendar',
                    tabBarIcon: ({color}: any) => <MaterialIcons size={28} name="calendar-month" color={color}/>,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({color}: any) => <MaterialIcons size={28} name="settings" color={color}/>,
                }}
            />
        </Tabs>
    );
}
