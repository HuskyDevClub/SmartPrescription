import React from "react";
import { PrescriptionAgenda } from "@/components/PrescriptionAgenda";
import { SafeAreaView, ScrollView } from "react-native";

export default function AgendaScreen() {
    return (
        <ScrollView>
            <SafeAreaView>
                <PrescriptionAgenda/>
            </SafeAreaView>
        </ScrollView>
    );
}
