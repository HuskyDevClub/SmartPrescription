import React from "react";
import { PrescriptionAgenda } from "@/components/PrescriptionAgenda";
import { ScrollView } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AgendaScreen() {
    return (
        <ScrollView>
            <SafeAreaView>
                <PrescriptionAgenda/>
            </SafeAreaView>
        </ScrollView>
    );
}
