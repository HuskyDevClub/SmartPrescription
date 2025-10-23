import React from "react";
import { SettingsMenu } from "@/components/SettingsMenu";
import { ScrollView } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    return (
        <ScrollView>
            <SafeAreaView>
                <SettingsMenu/>
            </SafeAreaView>
        </ScrollView>
    );
}
