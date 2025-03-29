import React from "react";
import {PrescriptionAgenda} from "@/components/PrescriptionAgenda";
import {ScrollView} from "react-native";

export default function AgendaScreen() {
    return (
        <ScrollView>
            <PrescriptionAgenda/>
        </ScrollView>
    );
}
