import React, {useCallback, useEffect, useState} from 'react';
import {Alert, Platform, StyleSheet, Switch, Text, TouchableOpacity, View,} from 'react-native';
import Slider from '@react-native-community/slider';
import {SettingsService, ThreeMeals} from "@/components/services/SettingsService";
import {PrescriptionService} from "@/components/services/PrescriptionService";
import {useFocusEffect} from "expo-router";
import DateTimePicker, {DateTimePickerAndroid, DateTimePickerEvent} from "@react-native-community/datetimepicker";

export const SettingsMenu = () => {

    const minSnoozeTime: number = 5;

    const [refreshFlag, setRefreshFlag] = useState<boolean>(false);
    const [updateFlag, setUpdateFlag] = useState<boolean>(false);

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

    // Helper to handle time changes for all meals
    const handleTimeChange = async (event: DateTimePickerEvent, selectedTime: Date | undefined, mealType: ThreeMeals) => {
        if (event.type === "set" && selectedTime) {
            if (mealType === ThreeMeals.Breakfast) {
                SettingsService.current.breakfastTime.hours = selectedTime.getHours();
                SettingsService.current.breakfastTime.minutes = selectedTime.getMinutes();
            } else if (mealType === ThreeMeals.Lunch) {
                SettingsService.current.lunchTime.hours = selectedTime.getHours();
                SettingsService.current.lunchTime.minutes = selectedTime.getMinutes();
            } else {
                SettingsService.current.dinnerTime.hours = selectedTime.getHours();
                SettingsService.current.dinnerTime.minutes = selectedTime.getMinutes();
            }
            await SettingsService.save();
            setRefreshFlag(!refreshFlag);
        }
    };

    // Function to show Android time picker
    const showAndroidTimePicker = (mealType: ThreeMeals) => {
        let hours: number, minutes: number;

        if (mealType === ThreeMeals.Breakfast) {
            hours = SettingsService.current.breakfastTime.hours;
            minutes = SettingsService.current.breakfastTime.minutes;
        } else if (mealType === ThreeMeals.Lunch) {
            hours = SettingsService.current.lunchTime.hours;
            minutes = SettingsService.current.lunchTime.minutes;
        } else {
            hours = SettingsService.current.dinnerTime.hours;
            minutes = SettingsService.current.dinnerTime.minutes;
        }

        DateTimePickerAndroid.open({
            value: new Date(2000, 1, 1, hours, minutes, 0, 0),
            mode: 'time',
            is24Hour: false,
            onChange: (event, selectedTime) => handleTimeChange(event, selectedTime, mealType)
        });
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
                        await SettingsService.save();
                        await PrescriptionService.updateNotificationButtons();
                        await PrescriptionService.rescheduleAllNotifications();
                        setRefreshFlag(!refreshFlag);
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
                    style={{alignSelf: "flex-start"}}
                    value={SettingsService.current.notificationsEnabled}
                    onValueChange={async (value) => {
                        await PrescriptionService.setNotificationsEnable(value)
                        setRefreshFlag(!refreshFlag);
                    }}
                    trackColor={{false: '#ddd', true: '#4B7BEC'}}
                    thumbColor={SettingsService.current.notificationsEnabled ? '#fff' : '#fff'}
                />
            </View>

            {/* Customize times section */}
            <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Customize times</Text>

                {/* Breakfast time picker */}
                <View style={styles.rowContainer}>
                    <Text style={styles.subSettingLabel}>Breakfast</Text>
                    {Platform.OS === 'ios' ? (
                        <DateTimePicker
                            value={(() => new Date(2000, 1, 1, SettingsService.current.breakfastTime.hours, SettingsService.current.breakfastTime.minutes, 0, 0))()}
                            mode="time"
                            is24Hour={false}
                            onChange={async (event: DateTimePickerEvent, selectedTime?: Date) => handleTimeChange(event, selectedTime, ThreeMeals.Breakfast)}
                        />
                    ) : (
                        <TouchableOpacity
                            onPress={() => showAndroidTimePicker(ThreeMeals.Breakfast)}
                            style={styles.timeButton}
                        >
                            <Text>
                                {`${String(SettingsService.current.breakfastTime.hours).padStart(2, '0')}:${String(SettingsService.current.breakfastTime.minutes).padStart(2, '0')}`}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Lunchtime picker */}
                <View style={styles.rowContainer}>
                    <Text style={styles.subSettingLabel}>Lunch</Text>
                    {Platform.OS === 'ios' ? (
                        <DateTimePicker
                            value={(() => new Date(2000, 1, 1, SettingsService.current.lunchTime.hours, SettingsService.current.lunchTime.minutes, 0, 0))()}
                            mode="time"
                            is24Hour={false}
                            onChange={async (event: DateTimePickerEvent, selectedTime?: Date) => handleTimeChange(event, selectedTime, ThreeMeals.Lunch)}
                        />
                    ) : (
                        <TouchableOpacity
                            onPress={() => showAndroidTimePicker(ThreeMeals.Lunch)}
                            style={styles.timeButton}
                        >
                            <Text>
                                {`${String(SettingsService.current.lunchTime.hours).padStart(2, '0')}:${String(SettingsService.current.lunchTime.minutes).padStart(2, '0')}`}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Dinner time picker */}
                <View style={styles.rowContainer}>
                    <Text style={styles.subSettingLabel}>Dinner</Text>
                    {Platform.OS === 'ios' ? (
                        <DateTimePicker
                            value={(() => new Date(2000, 1, 1, SettingsService.current.dinnerTime.hours, SettingsService.current.dinnerTime.minutes, 0, 0))()}
                            mode="time"
                            is24Hour={false}
                            display="default"
                            onChange={async (event: DateTimePickerEvent, selectedTime?: Date) => handleTimeChange(event, selectedTime, ThreeMeals.Dinner)}
                        />
                    ) : (
                        <TouchableOpacity
                            onPress={() => showAndroidTimePicker(ThreeMeals.Dinner)}
                            style={styles.timeButton}
                        >
                            <Text>
                                {`${String(SettingsService.current.dinnerTime.hours).padStart(2, '0')}:${String(SettingsService.current.dinnerTime.minutes).padStart(2, '0')}`}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Clear all prescriptions */}
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
    timeButton: {
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 6,
        minWidth: 80,
        alignItems: 'center',
    }
});