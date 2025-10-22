import { SafeAreaView, ScrollView } from 'react-native';
import { PrescriptionsTable } from "@/components/PrescriptionsTable";
import React from "react";

export default function HomeScreen() {
    return (
        <ScrollView>
            <SafeAreaView>
                <PrescriptionsTable/>
            </SafeAreaView>
        </ScrollView>
    );
}