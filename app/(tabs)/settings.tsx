import React from "react";
import {SettingsMenu} from "@/components/SettingsMenu";
import {SafeAreaView, ScrollView} from "react-native";

export default function SettingsScreen() {
    return (
        <ScrollView>
            <SafeAreaView>
                <SettingsMenu/>
            </SafeAreaView>
        </ScrollView>
    );
}
