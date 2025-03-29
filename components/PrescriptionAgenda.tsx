import React, {useEffect, useState} from 'react';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {Calendar} from 'react-native-calendars';
import {PrescriptionRecord} from "@/components/models/MedicalPrescription";
import {PrescriptionService} from "@/components/services/PrescriptionService";
import {DateService} from "@/components/services/DateService";

export const PrescriptionAgenda = () => {
    const [markedDates, setMarkedDates] = useState<any>({});
    const [selectedDate, setSelectedDate] = useState(DateService.formatDate(new Date()));
    const [dailyMedications, setDailyMedications] = useState<PrescriptionRecord[]>([]);

    useEffect(() => {
        // Function to fetch and update data
        const updateData = () => {
            PrescriptionService.init().then(_ => {
                // Generate marked dates from prescriptions
                const marks: any = {};

                PrescriptionService.getAllPrescriptions().forEach(prescription => {
                    // Mark all dates between start and end
                    let currentDate = new Date(prescription.startAt);
                    while (DateService.isDateSameOrBefore(currentDate, prescription.endAt)) {
                        const dateStr: string = DateService.formatDate(currentDate);

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
        };

        // Initial data fetch
        updateData();

        // Set up interval to run every second (1000ms)
        const intervalId = setInterval(updateData, 1000);

        // Clean up interval when component unmounts or when dependencies change
        return () => clearInterval(intervalId);
    }, [selectedDate]); // selectedDate is still a dependency for updateDailyMedications

    // Update medications for the selected date
    const updateDailyMedications = (date: string) => {
        const selectedDate = new Date(date);
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
                    Medications for {DateService.formatDisplayDate(selectedDate)}
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