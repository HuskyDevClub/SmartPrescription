import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { PrescriptionRecord } from "@/components/models/MedicalPrescription";
import { PrescriptionService } from "@/components/services/PrescriptionService";
import { DateService } from "@/components/services/DateService";
import { UserDataService } from "@/components/services/UserDataService";
import { useFocusEffect } from "expo-router";

export const PrescriptionAgenda = () => {
    const [markedDates, setMarkedDates] = useState<any>({});
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [dailyMedications, setDailyMedications] = useState<PrescriptionRecord[]>([]);
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
        // Function to fetch and update data
        async function updateData(): Promise<void> {
            PrescriptionService.init().then(_ => {
                // Generate marked dates from prescriptions
                const marks: any = {};

                PrescriptionService.getAllPrescriptions().forEach(prescription => {
                    // Mark all dates between start and end
                    let currentDate = new Date(prescription.startAt);
                    while (DateService.isDateSameOrBefore(currentDate, prescription.endAt)) {
                        // format date as YYYY-MM-DD
                        const dateStr: string = DateService.getFormattedDate(currentDate);

                        if (!marks[dateStr]) {
                            marks[dateStr] = {
                                marked: true,
                                dots: []
                            };
                        }

                        // Add a dot for this medication
                        marks[dateStr].dots.push({
                            key: prescription.id,
                            color: generateColorForMedication(prescription.name),
                            selectedDotColor: 'white'
                        });

                        // Add one day to current date
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                });

                setMarkedDates(marks);

                // Update daily medications for the selected date
                updateDailyMedications(selectedDate);
            });
        }

        // Initial data fetch
        updateData().then();

    }, [updateFlag]);

    // Update medications for the selected date
    const updateDailyMedications = (selectedDate: Date) => {
        const medsForDay = PrescriptionService.getAllPrescriptions().filter(prescription => {
            return DateService.isDateSameOrAfter(selectedDate, prescription.startAt) &&
                DateService.isDateSameOrBefore(selectedDate, prescription.endAt);
        });
        setDailyMedications(medsForDay);
    };

    // Simple function to generate a color based on medication name
    const generateColorForMedication = (name: string) => {
        // This is a simple hash function to convert a string to a color
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }

        const c = (hash & 0x00FFFFFF)
            .toString(16)
            .toUpperCase();

        return `#${'00000'.substring(0, 6 - c.length)}${c}`;
    };

    // Handle date selection
    const onDayPress = (day: any) => {
        const parts: number[] = day.dateString.split('-').map(Number);
        const theDate = new Date(parts[0], parts[1] - 1, parts[2]);
        setSelectedDate(theDate);
        updateDailyMedications(theDate);
    };

    return (
        <View style={styles.container}>
            <Calendar
                markingType={'multi-dot'}
                markedDates={markedDates}
                onDayPress={onDayPress}
                theme={{
                    selectedDayBackgroundColor: '#4285F4',
                    todayTextColor: '#4285F4',
                    arrowColor: '#4285F4',
                }}
            />

            <View style={styles.medicationsContainer}>
                <Text style={styles.dateTitle}>
                    Medications for {selectedDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                })}
                </Text>

                {dailyMedications.length > 0 ? (
                    dailyMedications.map(med => (
                        <View key={med.id} style={styles.medicationItem}>
                            <View
                                style={[
                                    styles.colorDot,
                                    {backgroundColor: generateColorForMedication(med.name)}
                                ]}
                            />
                            <Text style={styles.medicationName}>{med.name}</Text>
                            <Text style={styles.medicationDose}>
                                {med.dosage}
                            </Text>
                            <View style={styles.timesContainer}>
                                {(
                                    [
                                        ...med.reminderTimes,
                                        ...med.taken
                                            .map(t => new Date(t)).filter(t => t.getFullYear() == selectedDate.getFullYear()
                                                && t.getMonth() == selectedDate.getMonth()
                                                && t.getDate() == selectedDate.getDate()
                                                && med.reminderTimes.find(rt => rt.minutes == t.getMinutes() && rt.hours == t.getHours()) == undefined)
                                            .map(t => DateService.getTime(t))
                                    ].sort((a, b) => {
                                        // First compare hours
                                        if (a.hours !== b.hours) {
                                            return a.hours - b.hours;
                                        }
                                        // If hours are equal, compare minutes
                                        return a.minutes - b.minutes;
                                    })
                                ).map((timeObj, index) => {
                                    const now: Date = new Date();
                                    const theTime: Date = new Date(selectedDate);
                                    theTime.setHours(timeObj.hours, timeObj.minutes, 0, 0);
                                    const timeFormatedForDisplay: string = DateService.formatTimeForDisplay(timeObj);
                                    // Show upcoming taken time
                                    if (theTime > now) {
                                        return (
                                            <TouchableOpacity key={index}
                                                              style={[styles.timeChip, {backgroundColor: '#E1F5FE'}]}>
                                                <Text>
                                                    {timeObj.label.length > 0 ? `${timeObj.label} (${timeFormatedForDisplay})` : timeFormatedForDisplay}
                                                </Text>
                                            </TouchableOpacity>
                                        )
                                    }
                                    // Show whether the medicine has been taken or not
                                    const hasTaken: number = med.taken.indexOf(theTime.toString())
                                    return (
                                        <TouchableOpacity key={index}
                                                          style={[styles.timeChip, {backgroundColor: hasTaken >= 0 ? "lightgreen" : "pink"}]}
                                                          onPress={async () => {
                                                              if (hasTaken >= 0) {
                                                                  med.taken.splice(hasTaken, 1);
                                                              } else if (!med.taken.includes(theTime.toString())) {
                                                                  med.taken.push(theTime.toString())
                                                              }
                                                              await UserDataService.save();
                                                              setRefreshFlag(!refreshFlag);
                                                          }}>
                                            <Text>
                                                {timeObj.label.length > 0 ? `${timeObj.label} (${timeFormatedForDisplay})` : timeFormatedForDisplay}
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                })}
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={styles.noMedications}>
                        No medications scheduled for this day
                    </Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        marginBottom: 40
    },
    medicationsContainer: {
        marginTop: 20,
        padding: 16,
    },
    dateTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    medicationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    colorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 10,
    },
    medicationName: {
        fontWeight: 'bold',
        fontSize: 16,
        flex: 1,
    },
    medicationDose: {
        marginRight: 10,
        color: '#555',
    },
    timesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
        width: '100%',
    },
    timeChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 4,
        fontSize: 12,
    },
    noMedications: {
        fontStyle: 'italic',
        color: '#757575',
    }
});