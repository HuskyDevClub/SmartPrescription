import React, {useEffect, useState} from 'react';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {Calendar} from 'react-native-calendars';
import moment from 'moment';
import {PrescriptionRecord} from "@/components/models/MedicalPrescription";
import {UserDataService} from "@/components/services/UserDataService";

export const PrescriptionAgenda = () => {
    const [markedDates, setMarkedDates] = useState<any>({});
    const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
    const [dailyMedications, setDailyMedications] = useState<PrescriptionRecord[]>([]);
    const [myPrescriptions, setMyPrescriptions] = useState<PrescriptionRecord[]>([]);

    useEffect(() => {
        async function fetchMyPrescriptions(): Promise<PrescriptionRecord[]> {
            return UserDataService.try_get("Prescriptions", []);
        }

        fetchMyPrescriptions().then(prescriptions => {
                setMyPrescriptions(prescriptions);

                // Generate marked dates from prescriptions
                const marks: any = {};

                prescriptions.forEach(prescription => {
                    const startDate = moment(prescription.startAt);
                    const endDate = moment(prescription.endAt);

                    // Mark all dates between start and end
                    let currentDate = moment(startDate);
                    while (currentDate.isSameOrBefore(endDate, 'day')) {
                        const dateStr = currentDate.format('YYYY-MM-DD');

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

                        currentDate.add(1, 'days');
                    }
                });

                setMarkedDates(marks);

                // Update daily medications for the selected date
                updateDailyMedications(selectedDate);
            }
        )
    }, [myPrescriptions, selectedDate]);

    // Update medications for the selected date
    const updateDailyMedications = (date: string) => {
        const medsForDay = myPrescriptions.filter(prescription => {
            const selectedMoment = moment(date);
            const startDate = moment(prescription.startAt);
            const endDate = moment(prescription.endAt);

            return selectedMoment.isSameOrAfter(startDate, 'day') &&
                selectedMoment.isSameOrBefore(endDate, 'day');
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
        setSelectedDate(day.dateString);
        updateDailyMedications(day.dateString);
    };

    return (
        <SafeAreaView style={styles.container}>
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
                    Medications for {moment(selectedDate).format('MMMM D, YYYY')}
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
                                {med.doseQty} {med.doseUnit}
                            </Text>
                            <View style={styles.timesContainer}>
                                {med.reminderTimes.map((time, index) => (
                                    <Text key={index} style={styles.timeChip}>
                                        {time}
                                    </Text>
                                ))}
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={styles.noMedications}>
                        No medications scheduled for this day
                    </Text>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
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
        backgroundColor: '#E1F5FE',
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