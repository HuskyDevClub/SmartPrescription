import React, {useEffect, useState} from 'react';
import {StyleSheet, Switch, Text, TouchableOpacity, View,} from 'react-native';
import Slider from '@react-native-community/slider';
import {SettingsService} from "@/components/services/SettingsService";
import {PrescriptionService} from "@/components/services/PrescriptionService";

export const SettingsMenu = () => {

    const minSnoozeTime: number = 5;

    const [forceUpdate, setForceUpdate] = useState<boolean>(false);

    const saveChanges = async () => {
        await SettingsService.save();
        setForceUpdate(!forceUpdate);
    };

    useEffect(() => {
        SettingsService.init().then(_ => setForceUpdate(!forceUpdate))
    }, [])

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Settings</Text>

            {/* Snooze Time Slider */}
            <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Time to snooze</Text>
                <Text style={styles.settingValue}>{SettingsService.current.snoozeTime} min</Text>
                <Slider
                    style={styles.slider}
                    value={SettingsService.current.snoozeTime}
                    minimumValue={minSnoozeTime}
                    maximumValue={60}
                    step={5}
                    onValueChange={async (value) => {
                        SettingsService.current.snoozeTime = value
                        await saveChanges()
                    }}
                    minimumTrackTintColor="#4B7BEC"
                    maximumTrackTintColor="#ddd"
                    thumbTintColor="#4B7BEC"
                />
                <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>minSnoozeTime</Text>
                    <Text style={styles.sliderLabel}>60</Text>
                </View>
            </View>

            {/* Notifications Toggle */}
            <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Enable notifications</Text>
                <Switch
                    value={SettingsService.current.notificationsEnabled}
                    onValueChange={async (value) => {
                        await PrescriptionService.setNotificationsEnable(value)
                        setForceUpdate(!forceUpdate);
                    }
                    }
                    trackColor={{false: '#ddd', true: '#4B7BEC'}}
                    thumbColor={SettingsService.current.notificationsEnabled ? '#fff' : '#fff'}
                />
            </View>

            {/* Font Size Selection */}
            <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Font size</Text>
                <View style={styles.fontSizeOptions}>
                    <TouchableOpacity
                        style={[
                            styles.fontSizeButton,
                            SettingsService.current.fontSize === 'small' && styles.fontSizeButtonActive,
                        ]}
                        onPress={async () => {
                            SettingsService.current.fontSize = "small"
                            await saveChanges()
                        }}
                    >
                        <Text
                            style={[
                                styles.fontSizeButtonText,
                                SettingsService.current.fontSize === 'small' && styles.fontSizeButtonTextActive,
                                {fontSize: 12},
                            ]}
                        >
                            Small
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.fontSizeButton,
                            SettingsService.current.fontSize === 'medium' && styles.fontSizeButtonActive,
                        ]}
                        onPress={async () => {
                            SettingsService.current.fontSize = "medium"
                            await saveChanges()
                        }}
                    >
                        <Text
                            style={[
                                styles.fontSizeButtonText,
                                SettingsService.current.fontSize === 'medium' && styles.fontSizeButtonTextActive,
                                {fontSize: 14},
                            ]}
                        >
                            Medium
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.fontSizeButton,
                            SettingsService.current.fontSize === 'large' && styles.fontSizeButtonActive,
                        ]}
                        onPress={async () => {
                            SettingsService.current.fontSize = "large"
                            await saveChanges()
                        }}
                    >
                        <Text
                            style={[
                                styles.fontSizeButtonText,
                                SettingsService.current.fontSize === 'large' && styles.fontSizeButtonTextActive,
                                {fontSize: 16},
                            ]}
                        >
                            Large
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        margin: 16,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    settingItem: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    settingLabel: {
        fontSize: 16,
        color: '#333',
        marginBottom: 8,
    },
    settingValue: {
        fontSize: 14,
        color: '#888',
        marginBottom: 8,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },
    sliderLabel: {
        fontSize: 12,
        color: '#888',
    },
    fontSizeOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    fontSizeButton: {
        flex: 1,
        padding: 10,
        alignItems: 'center',
        borderRadius: 6,
        marginHorizontal: 4,
        backgroundColor: '#f0f0f0',
    },
    fontSizeButtonActive: {
        backgroundColor: '#4B7BEC',
    },
    fontSizeButtonText: {
        color: '#555',
    },
    fontSizeButtonTextActive: {
        color: '#fff',
    }
});
