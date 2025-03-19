import {Image} from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import {ThemedText} from '@/components/ThemedText';
import {ThemedView} from '@/components/ThemedView';
import {PrescriptionsTable} from "@/components/PrescriptionsTable";
import React from "react";

export default function HomeScreen() {
    return (
        <ParallaxScrollView
            headerBackgroundColor={{light: '#A1CEDC', dark: '#1D3D47'}}
            headerImage={
                <Image
                    source={require('@/assets/images/partial-react-logo.png')}

                />
            }>
            <ThemedView>
                <ThemedText type="title">Welcome Back</ThemedText>
            </ThemedView>
            <PrescriptionsTable/>
        </ParallaxScrollView>
    );
}