import React, {useCallback, useEffect, useState} from 'react';
import {Alert, StyleSheet, Switch, Text, TouchableOpacity, View,} from 'react-native';
import Slider from '@react-native-community/slider';
import {SettingsService} from "@/components/services/SettingsService";
import {PrescriptionService} from "@/components/services/PrescriptionService";
import {useFocusEffect} from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import {DateService} from "@/components/services/DateService";

export const SettingsMenu = () => {

    const minSnoozeTime: number = 5;

    const [refreshFlag, setRefreshFlag] = useState<boolean>(false);
    const [updateFlag, setUpdateFlag] = useState<boolean>(false);

    const saveChanges = async () => {
        await SettingsService.save();
        setRefreshFlag(!refreshFlag);
    };

    useFocusEffect(
        useCallback(() => {
            setUpdateFlag(prevState => !prevState)
            return () => {
            };
        }, [])
    );

    useEffect(() => {
        async function init(): Promise<void> {
            await SettingsService.init()
            setRefreshFlag(!refreshFlag);
        }

        init().then()
    }, [updateFlag])

    // Handler for clear all button
    const handleClearAll = async (): Promise<void> => {
        // Alert user before removal
        Alert.alert('Warning', 'Are you sure you want to delete all prescriptions?', [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Confirm', onPress: async () => {
                    await PrescriptionService.clear()
                    setRefreshFlag(!refreshFlag);
                }
            },
        ]);
    };

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
                        await PrescriptionService.rescheduleAllNotifications();
                    }}
                    minimumTrackTintColor="#4B7BEC"
                    maximumTrackTintColor="#ddd"
                    thumbTintColor="#4B7BEC"
                />
                <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>{minSnoozeTime}</Text>
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
                        setRefreshFlag(!refreshFlag);
                    }}
                    trackColor={{false: '#ddd', true: '#4B7BEC'}}
                    thumbColor={SettingsService.current.notificationsEnabled ? '#fff' : '#fff'}
                />
            </View>

            {/* Notifications Toggle */}
            <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Customize times</Text>
                <View style={styles.rowContainer}>
                    <Text style={styles.subSettingLabel}>Breakfast</Text>
                    <DateTimePicker
                        value={(() => {
                            const date = new Date();
                            const [hours, minutes] = SettingsService.current.breakfastTime.split(':').map(Number);
                            date.setHours(hours, minutes, 0, 0);
                            return date
                        })()}
                        mode="time"
                        is24Hour={false}
                        display="default"
                        onChange={(_: any, selectedTime?: Date) => {
                            if (selectedTime) {
                                SettingsService.current.breakfastTime = DateService.getTime(selectedTime);
                            }
                        }}
                    />
                </View>
                <View style={styles.rowContainer}>
                    <Text style={styles.subSettingLabel}>Lunch</Text>
                    <DateTimePicker
                        value={(() => {
                            const date = new Date();
                            const [hours, minutes] = SettingsService.current.lunchTime.split(':').map(Number);
                            date.setHours(hours, minutes, 0, 0);
                            return date
                        })()}
                        mode="time"
                        is24Hour={false}
                        display="default"
                        onChange={(_: any, selectedTime?: Date) => {
                            if (selectedTime) {
                                SettingsService.current.lunchTime = DateService.getTime(selectedTime);
                            }
                        }}
                    />
                </View>
                <View style={styles.rowContainer}>
                    <Text style={styles.subSettingLabel}>Dinner</Text>
                    <DateTimePicker
                        value={(() => {
                            const date = new Date();
                            const [hours, minutes] = SettingsService.current.dinnerTime.split(':').map(Number);
                            date.setHours(hours, minutes, 0, 0);
                            return date
                        })()}
                        mode="time"
                        is24Hour={false}
                        display="default"
                        onChange={(_: any, selectedTime?: Date) => {
                            if (selectedTime) {
                                SettingsService.current.dinnerTime = DateService.getTime(selectedTime);
                            }
                        }}
                    />
                </View>
            </View>

            {/* Font Size Selection */}
            {PrescriptionService.notEmpty() && <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Clear all prescriptions</Text>
                <TouchableOpacity
                    style={styles.fontSizeButton}
                    onPress={handleClearAll}
                >
                    <Text>
                        Clear all
                    </Text>
                </TouchableOpacity>
            </View>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginLeft: 16,
        marginRight: 16,
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
    rowContainer: {
        flexDirection: 'row',
        justifyContent: "space-between",
        alignItems: 'center',
        marginTop: 8,
    },
    subSettingLabel: {
        fontSize: 16,
        color: '#333',
        marginBottom: 8,
    },
});
