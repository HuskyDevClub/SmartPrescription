import React, {useState} from 'react';
import {StyleSheet, Switch, Text, TouchableOpacity, View,} from 'react-native';
import Slider from '@react-native-community/slider';

interface SettingsState {
    snoozeTime: number;
    notificationsEnabled: boolean;
    fontSize: 'small' | 'medium' | 'large';
}

export const SettingsMenu = () => {
    const [settings, setSettings] = useState<SettingsState>({
        snoozeTime: 15,
        notificationsEnabled: true,
        fontSize: 'medium',
    });

    const handleSaveSettings = () => {

    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Settings</Text>

            {/* Snooze Time Slider */}
            <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Time to snooze</Text>
                <Text style={styles.settingValue}>{settings.snoozeTime} min</Text>
                <Slider
                    style={styles.slider}
                    value={settings.snoozeTime}
                    minimumValue={0}
                    maximumValue={60}
                    step={5}
                    onValueChange={(value) =>
                        setSettings({...settings, snoozeTime: value})
                    }
                    minimumTrackTintColor="#4B7BEC"
                    maximumTrackTintColor="#ddd"
                    thumbTintColor="#4B7BEC"
                />
                <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>0</Text>
                    <Text style={styles.sliderLabel}>60</Text>
                </View>
            </View>

            {/* Notifications Toggle */}
            <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Enable notifications</Text>
                <Switch
                    value={settings.notificationsEnabled}
                    onValueChange={(value) =>
                        setSettings({...settings, notificationsEnabled: value})
                    }
                    trackColor={{false: '#ddd', true: '#4B7BEC'}}
                    thumbColor={settings.notificationsEnabled ? '#fff' : '#fff'}
                />
            </View>

            {/* Font Size Selection */}
            <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Font size</Text>
                <View style={styles.fontSizeOptions}>
                    <TouchableOpacity
                        style={[
                            styles.fontSizeButton,
                            settings.fontSize === 'small' && styles.fontSizeButtonActive,
                        ]}
                        onPress={() => setSettings({...settings, fontSize: 'small'})}
                    >
                        <Text
                            style={[
                                styles.fontSizeButtonText,
                                settings.fontSize === 'small' && styles.fontSizeButtonTextActive,
                                {fontSize: 12},
                            ]}
                        >
                            Small
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.fontSizeButton,
                            settings.fontSize === 'medium' && styles.fontSizeButtonActive,
                        ]}
                        onPress={() => setSettings({...settings, fontSize: 'medium'})}
                    >
                        <Text
                            style={[
                                styles.fontSizeButtonText,
                                settings.fontSize === 'medium' && styles.fontSizeButtonTextActive,
                                {fontSize: 14},
                            ]}
                        >
                            Medium
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.fontSizeButton,
                            settings.fontSize === 'large' && styles.fontSizeButtonActive,
                        ]}
                        onPress={() => setSettings({...settings, fontSize: 'large'})}
                    >
                        <Text
                            style={[
                                styles.fontSizeButtonText,
                                settings.fontSize === 'large' && styles.fontSizeButtonTextActive,
                                {fontSize: 16},
                            ]}
                        >
                            Large
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveSettings}
            >
                <Text style={styles.saveButtonText}>Save Settings</Text>
            </TouchableOpacity>
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
    },
    saveButton: {
        backgroundColor: '#4B7BEC',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
