import React from "react";
import {PrescriptionAgenda} from "@/components/PrescriptionAgenda";
import {Animated} from "react-native";
import ScrollView = Animated.ScrollView;

export default function AgendaScreen() {
    return (
        <ScrollView>
            <PrescriptionAgenda/>
        </ScrollView>
    );
}
