import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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