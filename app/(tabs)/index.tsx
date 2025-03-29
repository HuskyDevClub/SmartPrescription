import {SafeAreaView, ScrollView} from 'react-native';
import {ThemedText} from '@/components/ThemedText';
import {PrescriptionsTable} from "@/components/PrescriptionsTable";
import React from "react";

export default function HomeScreen() {
    return (
        <ScrollView>
            <SafeAreaView>
                <ThemedText type="title">My Pill</ThemedText>
                <PrescriptionsTable/>
            </SafeAreaView>
        </ScrollView>
    );
}