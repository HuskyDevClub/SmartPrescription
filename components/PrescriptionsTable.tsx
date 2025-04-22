import React, {useCallback, useEffect, useState} from 'react';
import {MedicalPrescription, PrescriptionRecord} from "@/components/models/MedicalPrescription";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {UserDataService} from "@/components/services/UserDataService";
import * as ImagePicker from "expo-image-picker";
import {ImagePickerResult} from "expo-image-picker";
import {AiService} from "@/components/services/AiService";
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Notifications from 'expo-notifications';
import {PrescriptionService} from "@/components/services/PrescriptionService";
import {DateService} from "@/components/services/DateService";
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {SharedValue, useAnimatedStyle} from 'react-native-reanimated';
import {SettingsService} from "@/components/services/SettingsService";
import {useFocusEffect} from "expo-router";
import {RateLimiter} from "@/components/services/RateLimiter";

export const PrescriptionsTable = () => {
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [editItem, setEditItem] = useState<PrescriptionRecord | null>(null);
    const [editedValues, setEditedValues] = useState<PrescriptionRecord>(PrescriptionService.new());
    const [attachments, setAttachments] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [editingTimeIndex, setEditingTimeIndex] = useState<number>(-1);
    const [refreshFlag, setRefreshFlag] = useState<boolean>(false);
    const [updateFlag, setUpdateFlag] = useState<boolean>(false);
    const [abortController, setAbortController] = useState<AbortController | null>(null);

    // Create a rate limiter instance for API calls - 10 calls per hour (3,600,000 milliseconds)
    const apiRateLimiter: RateLimiter = new RateLimiter('ai_api_calls', 10, 3600000);
    // Create rate-limited version of the function
    const rateLimitedGetImageText = apiRateLimiter.limit(AiService.getImageText);

    // Handler for edit button
    const handleEdit = (item: PrescriptionRecord): void => {
        setEditItem(item);
        setEditedValues({...item});
        setModalVisible(true);
    };

    // Handler for cancel changes
    const closeModal = (): void => {
        setModalVisible(false);
        startEditingTimeIndex(-1);
    };

    // Handler for saving changes
    const handleSave = async (): Promise<void> => {
        startEditingTimeIndex(-1);
        if (editItem) {
            editItem.name = editedValues.name;
            editItem.type = editedValues.type;
            editItem.dosage = editedValues.dosage;
            editItem.food = editedValues.food;
            editItem.taken = editedValues.taken;
            editItem.reminderTimes = editedValues.reminderTimes;
            editItem.startAt = editedValues.startAt;
            editItem.endAt = editedValues.endAt;

            // Schedule new notifications for all reminder times
            await PrescriptionService.scheduleNotifications(editItem);
            // Save changes
            await UserDataService.save();
        } else {
            // Add the Prescription
            await PrescriptionService.addPrescription({
                ...editedValues,
                id: Date.now().toString(),
            });
        }
        setModalVisible(false);
    };

    // Handler for delete button
    const handleDelete = async (id: string): Promise<void> => {
        // Alert user before removal
        Alert.alert('Warning', 'Are you sure you want to delete this item?', [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Confirm', onPress: async () => {
                    await PrescriptionService.removePrescription(id);
                    setEditItem(PrescriptionService.new());
                }
            },
        ]);
    };

    // Handler for add button
    const handleAdd = (): void => {
        setEditItem(null);
        setEditedValues(PrescriptionService.new())
        setModalVisible(true);
    }


    async function takePrescriptionPhoto(): Promise<void> {
        // Clear attachments
        setAttachments([])
        // Request permission
        await ImagePicker.requestCameraPermissionsAsync()
        // Launch camera for taking photo
        const result: ImagePickerResult = await ImagePicker.launchCameraAsync({
            base64: true,
        });
        // Process image if any photo was taken
        if (!result.canceled) {
            await sendSelectPrescriptionPhoto(result)
        }
    }

    async function selectPrescriptionPhoto(): Promise<void> {
        // Clear attachments
        setAttachments([])
        // Request permission
        await ImagePicker.requestMediaLibraryPermissionsAsync()
        // Prompt user for selecting photo
        const result: ImagePickerResult = await ImagePicker.launchImageLibraryAsync({
            base64: true,
        });
        // Process image if any photo was selected
        if (!result.canceled) {
            await sendSelectPrescriptionPhoto(result)
        }
    }

    async function sendSelectPrescriptionPhoto(result: ImagePickerResult): Promise<void> {
        if (result.assets) {
            for (let i = 0; i < result.assets.length; i++) {
                const theBase64 = result.assets[i].base64;
                if (theBase64) {
                    attachments.push('data:image/jpeg;base64,' + theBase64)
                }
            }
        }
        if (attachments.length > 0) {
            // Show loading spinner
            setIsLoading(true);

            // Create a new AbortController instance
            const controller = new AbortController();
            setAbortController(controller);

            try {
                // Create a cancellable promise
                const apiCallPromise = rateLimitedGetImageText(attachments);

                // Create a promise that resolves when user cancels
                const abortPromise = new Promise((_, reject) => {
                    controller.signal.addEventListener('abort', () => {
                        reject(new Error('Operation cancelled by user'));
                    });
                });

                // Race between the API call and the abort operation
                const response = await Promise.race([apiCallPromise, abortPromise]);

                // Rest of your existing processing logic...
                if (__DEV__) {
                    console.log(response.body)
                    console.log(`Time Until Reset: ${await apiRateLimiter.getTimeUntilReset()}`)
                    console.log(`Remaining Calls: ${await apiRateLimiter.getRemainingCalls()}`)
                    if (response.body.error) {
                        console.log(response.body.error)
                    } else {
                        console.log(response.body.choices[0].message?.content)
                    }
                }
                const result: Record<string, MedicalPrescription> = JSON.parse(response.body.choices[0].message?.content)
                // Trigger adding a new prescription from the parent component
                if (result) {
                    const allPrescriptionsExtracted: MedicalPrescription[] = Object.values(result);
                    if (allPrescriptionsExtracted.length > 0) {
                        for (const p of allPrescriptionsExtracted) {
                            const endAt: Date = new Date();
                            endAt.setDate(endAt.getDate() + p.days);
                            const newItem: PrescriptionRecord = {
                                name: p.name,
                                dosage: p.dosage,
                                type: p.type,
                                food: Number(p.food),
                                id: Date.now().toString(),
                                taken: [],
                                reminderTimes: [],
                                startAt: new Date(),
                                endAt: endAt
                            };
                            // Add time according to Frequency
                            const frequencyTable: string[] = p.frequency.split("-")
                            if (frequencyTable.at(0) == "1") {
                                newItem.reminderTimes.push({
                                    time: SettingsService.current.breakfastTime,
                                    label: "Breakfast"
                                });
                            }
                            if (frequencyTable.at(1) == "1") {
                                newItem.reminderTimes.push({
                                    time: SettingsService.current.lunchTime,
                                    label: "Lunch"
                                });
                            }
                            if (frequencyTable.at(2) == "1") {
                                newItem.reminderTimes.push({
                                    time: SettingsService.current.dinnerTime,
                                    label: "Dinner"
                                });
                            }
                            // Schedule notifications for new item
                            await PrescriptionService.addPrescription(newItem);
                        }
                        Alert.alert("Succeed", `In total of ${allPrescriptionsExtracted.length} medication(s) has been extracted. Please double-check the identified medication(s)!`);
                    } else {
                        Alert.alert('Invalid Image', 'Fail to extract any medication!');
                    }
                } else {
                    Alert.alert('Invalid Image', 'Please try again!');
                }
            } catch (error: any) {
                if (error.message === 'Operation cancelled by user') {
                    Alert.alert('Cancelled', 'The operation was cancelled.');
                } else if (__DEV__) {
                    Alert.alert('Error', error.message);
                } else {
                    Alert.alert('Invalid Image', 'Please try again!');
                }
            } finally {
                // Hide loading spinner regardless of success or failure
                setIsLoading(false);
                setAbortController(null);
            }
            setAttachments([])
        }
    }

    useFocusEffect(
        useCallback(() => {
            setUpdateFlag(prevState => !prevState)
            return () => {
            };
        }, [])
    );

    useEffect(() => {
        async function setupNotificationHandlers() {
            await PrescriptionService.init()

            // Request notification permissions
            const {status} = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow notifications to receive medication reminders');
                return;
            }

            // Set notification categories with action buttons
            await PrescriptionService.updateNotificationButtons();

            // Set notification handler
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                }),
            });

            // Set up notification response handler for action buttons
            const subscription = Notifications.addNotificationResponseReceivedListener(response => {
                const {actionIdentifier, notification} = response;
                const {id, notificationId, intendedTakenTime} = notification.request.content.data;

                if (actionIdentifier === 'TAKEN_ACTION') {
                    PrescriptionService.handleMedicationTaken(id, notificationId).then(() => setRefreshFlag(!refreshFlag));
                } else if (actionIdentifier === 'SNOOZE_ACTION') {
                    PrescriptionService.snoozeMedicationTaken(id, notificationId, intendedTakenTime)
                } else if (actionIdentifier === 'SKIP_ACTION') {
                    // Dismiss the notification
                    Notifications.dismissNotificationAsync(notificationId)
                }
            });

            setRefreshFlag(!refreshFlag);

            // Cleanup subscription on unmount
            return () => subscription.remove();
        }

        setupNotificationHandlers().then();
    }, [updateFlag]);

    /**
     * Filters an array of ReminderTime objects to ensure unique time values,
     * prioritizing entries with non-empty labels when duplicates exist
     * @param reminderTimes Array of ReminderTime objects
     * @returns A new array with unique time values
     */
    function getUniqueReminderTimes(reminderTimes: ReminderTime[]): ReminderTime[] {
        const uniqueTimes = new Map<string, ReminderTime>();

        // First pass: add all items to the map, potentially overwriting duplicates
        reminderTimes.forEach(reminder => {
            const existingReminder = uniqueTimes.get(reminder.time);

            // If this time doesn't exist in our map yet, add it
            if (!existingReminder) {
                uniqueTimes.set(reminder.time, reminder);
            }
            // If this time exists but current reminder has a label and existing one doesn't, replace it
            else if (reminder.label && !existingReminder.label) {
                uniqueTimes.set(reminder.time, reminder);
            }
            // Otherwise keep the existing reminder (first occurrence or one with label)
        });

        // Convert the map values back to an array
        return Array.from(uniqueTimes.values());
    }

    /**
     * Removes times from the taken array that match the hour and minute of a given ReminderTime
     * @param taken Array of date strings in format "Tue Apr 15 2025 08:18:00 GMT-0700"
     * @param reminderTime The ReminderTime object with time in "HH:MM" format
     * @returns A new array with matching times removed
     */
    function removeMatchingTimes(taken: string[], reminderTime: ReminderTime): string[] {
        // Extract hour and minute from the reminderTime (format "HH:MM")
        const [reminderHour, reminderMinute] = reminderTime.time.split(':').map(Number);

        // Filter out times that match the reminder's hour and minute
        return taken.filter(dateStr => {
            const date = new Date(dateStr);
            const hour = date.getHours();
            const minute = date.getMinutes();

            // Return false to filter out matching times (same hour and minute)
            return !(hour === reminderHour && minute === reminderMinute);
        });
    }

    const startEditingTimeIndex = (idx: number): void => {
        setEditingTimeIndex(idx)
        editedValues.reminderTimes = getUniqueReminderTimes(editedValues.reminderTimes)
    }

    // Handle time picker change
    const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date): void => {
        if (event.type == "dismissed") {
            startEditingTimeIndex(-1)
        } else if (event.type == "set" && selectedTime) {
            const timeString: string = DateService.getTime(selectedTime);
            if (editingTimeIndex >= 0 && editingTimeIndex < editedValues.reminderTimes.length) {
                // Update existing time slot
                editedValues.reminderTimes[editingTimeIndex].time = timeString;
            } else {
                editedValues.reminderTimes.push({time: timeString, label: ""});
            }
        }
    };

    // Remove a time slot
    const removeTimeSlot = (index: number): void => {
        if (editedValues.reminderTimes && editedValues.reminderTimes.length > index) {
            editedValues.taken = removeMatchingTimes(editedValues.taken, editedValues.reminderTimes[index])
            const updatedTimes = [...editedValues.reminderTimes];
            updatedTimes.splice(index, 1);
            setEditedValues({...editedValues, reminderTimes: updatedTimes});
        }
    };

    // Render expired prescriptions
    const RenderExpire: React.FC = () => {
        const expiredPrescription: PrescriptionRecord[] = PrescriptionService.getExpiredPrescriptions()
        if (expiredPrescription.length == 0) {
            return (<View/>);
        }
        return (
            <GestureHandlerRootView style={{marginTop: 60}}>
                <Text style={styles.modalTitle}>Expired</Text>
                {expiredPrescription.map((p, i) => renderItem(p, i))}
            </GestureHandlerRootView>
        )
    }

    // Header component
    const TableHeader: React.FC = () => (
        <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.nameColumn]}>Name</Text>
            <Text style={[styles.headerCell, styles.subColumn]}>Reminder</Text>
            <Text style={[styles.headerCell, styles.subColumn]}>Taken</Text>
            <Text style={[styles.headerCell, styles.subColumn]}>Skipped</Text>
        </View>
    );

    // Render item for list
    const renderItem = (item: PrescriptionRecord, index: number): React.ReactElement => {

        function RightAction(_: SharedValue<number>, drag: SharedValue<number>) {
            const styleAnimation = useAnimatedStyle(() => {
                return {
                    transform: [{translateX: drag.value + 50}],
                };
            });
            return (
                <View style={{
                    backgroundColor: 'red',
                    width: '100%',
                    justifyContent: "center",
                    alignItems: "flex-end"
                }}>
                    <Animated.View style={styleAnimation}>
                        <TouchableOpacity
                            onPress={() => handleDelete(item.id)}
                        >
                            <Ionicons name="trash" size={25} color="white"/>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            );
        }

        return (
            <View key={index}>
                <ReanimatedSwipeable friction={2}
                                     enableTrackpadTwoFingerGesture
                                     rightThreshold={50}
                                     overshootRight={false}
                                     overshootLeft={false}
                                     renderRightActions={RightAction}
                >
                    <View style={styles.row}>
                        <TouchableOpacity
                            style={[styles.cell, styles.nameColumn]}
                            onPress={() => handleEdit(item)}
                        >
                            <Text
                                style={[styles.cell, styles.nameColumn]}>{item.dosage.length > 0 ? `${item.name} (${item.dosage})` : item.name}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.cell, styles.subColumn]}
                            onPress={() => handleEdit(item)}
                        >
                            <Text style={styles.reminderSubtext}>
                                {item.reminderTimes.length > 0 ? item.reminderTimes.map(timeObj => DateService.formatTimeForDisplay(timeObj.time)).join(', ') : "-"}
                            </Text>
                        </TouchableOpacity>
                        <View
                            style={[styles.cell, styles.subColumn]}
                        >
                            <Text style={[styles.cell, styles.nameColumn, {color: "green"}]}>
                                {item.taken.length}
                            </Text>
                        </View>
                        <View
                            style={[styles.cell, styles.subColumn]}
                        >
                            <Text style={[styles.cell, styles.nameColumn, {color: "red"}]}>
                                {PrescriptionService.calculateDosesTakenSoFar(item) - item.taken.length}
                            </Text>
                        </View>
                    </View>
                </ReanimatedSwipeable>
                <View style={styles.separator}/>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={{flexDirection: 'row'}}>
                <Text style={styles.title}>MyPill</Text>
                <View style={styles.fabContainer}>
                    <TouchableOpacity style={styles.fabButton} onPress={takePrescriptionPhoto}>
                        <Ionicons name="camera" size={40} color="white"/>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.fabButton} onPress={selectPrescriptionPhoto}>
                        <Ionicons name="image" size={40} color="white"/>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.fabButton} onPress={handleAdd}>
                        <Ionicons name="add" size={40} color="white"/>
                    </TouchableOpacity>
                </View>
            </View>

            {isLoading && <Modal
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    if (abortController) {
                        abortController.abort();
                    }
                }}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.spinnerContainer}>
                        <ActivityIndicator
                            size="large"
                            color="#0275d8"
                        />
                        <Text style={styles.loadingText}>Processing prescription...</Text>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                if (abortController) {
                                    abortController.abort();
                                }
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>}

            {PrescriptionService.notEmpty() && <View style={styles.headerContainer}>
                <TableHeader/>
            </View>}

            <GestureHandlerRootView>
                {PrescriptionService.getNotExpiredPrescriptions().map((p, i) => renderItem(p, i))}
            </GestureHandlerRootView>

            <RenderExpire/>

            {/* Edit Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={styles.centeredView}>
                    <ScrollView style={styles.modalView} automaticallyAdjustKeyboardInsets={true}>
                        <Text style={styles.modalTitle}>{editItem ? 'Edit Item' : 'Add New Item'}</Text>

                        <Text style={styles.inputLabel}>Name:</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <TextInput
                                style={[styles.input, {flex: 6}]}
                                value={editedValues.name}
                                onChangeText={(text: string) => setEditedValues({...editedValues, name: text})}
                            />
                            {editedValues.name && <TouchableOpacity
                                style={{flex: 1, alignItems: 'center'}}
                                onPress={() => Linking.openURL(`https://www.google.com/search?q=${editedValues.name}`)}
                            >
                                <Ionicons name="link" size={28} color="blue"/>
                            </TouchableOpacity>}
                        </View>

                        <Text style={styles.inputLabel}>Dosage:</Text>
                        <TextInput
                            style={styles.input}
                            value={editedValues.dosage}
                            onChangeText={(text: string) => setEditedValues({...editedValues, dosage: text})}
                        />

                        <Text style={styles.inputLabel}>Type:</Text>
                        <TextInput
                            style={styles.input}
                            value={editedValues.type}
                            onChangeText={(text: string) => setEditedValues({...editedValues, type: text})}
                        />

                        <Text style={styles.inputLabel}>Food:</Text>
                        <TouchableOpacity
                            style={[
                                styles.button2,
                                editedValues.food === 1 ? styles.selectedButton : null
                            ]}
                            onPress={() => setEditedValues({
                                ...editedValues,
                                food: editedValues.food === 1 ? 0 : 1
                            })}
                        >
                            <Text style={[
                                styles.buttonText2,
                                editedValues.food === 1 ? styles.selectedButtonText : null
                            ]}>
                                Before Food
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.button2,
                                editedValues.food === 2 ? styles.selectedButton : null
                            ]}
                            onPress={() => setEditedValues({
                                ...editedValues,
                                food: editedValues.food === 2 ? 0 : 2
                            })}
                        >
                            <Text style={[
                                styles.buttonText2,
                                editedValues.food === 2 ? styles.selectedButtonText : null
                            ]}>
                                After Food
                            </Text>
                        </TouchableOpacity>

                        <View style={[styles.buttonContainer, {marginTop: 15}]}>
                            <View style={styles.splitBlockL}>
                                <Text style={styles.inputLabel}>Start At:</Text>
                                <DateTimePicker
                                    value={new Date(editedValues.startAt)}
                                    onChange={(_, theDate: Date | undefined) => setEditedValues({
                                        ...editedValues,
                                        startAt: new Date(theDate ? theDate : editedValues.startAt)
                                    })}
                                    maximumDate={new Date(editedValues.endAt)}
                                />
                            </View>
                            <View style={styles.splitBlockR}>
                                <Text style={styles.inputLabel}>End At:</Text>
                                <DateTimePicker
                                    value={new Date(editedValues.endAt)}
                                    onChange={(_, theDate: Date | undefined) => setEditedValues({
                                        ...editedValues,
                                        endAt: new Date(theDate ? theDate : editedValues.endAt)
                                    })}
                                    minimumDate={new Date(editedValues.startAt)}
                                />
                            </View>
                        </View>

                        <Text style={styles.inputLabel}>Reminder Times:</Text>

                        {/* List of existing time slots */}
                        {editedValues.reminderTimes && editedValues.reminderTimes.map((timeObj, idx) => (
                            <View key={idx} style={styles.timeSlotContainer}>
                                {/* Time picker (shown when adding/editing a time) */}
                                {editingTimeIndex == idx ? (
                                    <DateTimePicker
                                        value={(() => {
                                            const date = new Date();
                                            if (editingTimeIndex >= 0 &&
                                                editedValues.reminderTimes &&
                                                editedValues.reminderTimes[editingTimeIndex]) {
                                                const [hours, minutes] = editedValues.reminderTimes[editingTimeIndex].time.split(':').map(Number);
                                                date.setHours(hours, minutes, 0, 0);
                                            }
                                            return date;
                                        })()}
                                        mode="time"
                                        is24Hour={false}
                                        display="default"
                                        onChange={onTimeChange}
                                    />
                                ) : (
                                    <TouchableOpacity onPress={() => startEditingTimeIndex(idx)}>
                                        <Text style={styles.timeSlotText}>
                                            {DateService.formatTimeForDisplay(timeObj.time)}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                <TextInput style={styles.timeSlotText}
                                           placeholder={timeObj.label.length > 0 ? timeObj.label : "\<click to label\>"}
                                           onChangeText={(text: string) => {
                                               timeObj.label = text
                                           }}/>

                                <View style={styles.timeSlotButtons}>
                                    <TouchableOpacity
                                        style={styles.timeSlotDeleteButton}
                                        onPress={() => removeTimeSlot(idx)}
                                    >
                                        <Ionicons name="trash" size={18} color="#dc3545"/>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        {/* Add new time slot button */}
                        <TouchableOpacity
                            style={styles.addTimeButton}
                            onPress={() => {
                                editedValues.reminderTimes.push({time: DateService.getTime(), label: ""});
                                setEditingTimeIndex(editedValues.reminderTimes.length - 1)
                            }}
                        >
                            <Ionicons name="add-circle" size={20} color="#28a745"/>
                            <Text style={styles.addTimeButtonText}>Add Time Slot</Text>
                        </TouchableOpacity>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonCancel]}
                                onPress={closeModal}
                            >
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, {backgroundColor: !editedValues.name ? 'gray' : '#28a745'}]}
                                onPress={handleSave}
                                disabled={!editedValues.name}
                            >
                                <Text style={styles.buttonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </View>
    )
}


const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginLeft: 16,
        marginRight: 16,
        marginBottom: 60,
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
    headerContainer: {
        marginTop: 10,
        marginBottom: 10,
    },
    headerRow: {
        flexDirection: 'row',
        backgroundColor: '#007BFF',
        padding: 10,
        borderRadius: 5,
        marginBottom: 5,
    },
    headerCell: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 10,
        alignItems: 'center',
    },
    cell: {
        padding: 5,
        textAlign: 'center',
    },
    nameColumn: {
        flex: 2,
    },
    subColumn: {
        flex: 1.5,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    buttonContainer2: {
        justifyContent: 'space-around',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 16,
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 10,
        marginBottom: 15,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 20,
    },
    button: {
        borderRadius: 5,
        padding: 10,
        elevation: 2,
        minWidth: 100,
    },
    buttonCancel: {
        backgroundColor: '#dc3545',
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dim the screen with semi-transparent background
        justifyContent: 'center',
        alignItems: 'center',
    },
    spinnerContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 200, // Add some minimum width for better layout
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#333',
    },
    timeSlotContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        marginBottom: 8,
    },
    timeSlotText: {
        fontSize: 16,
        color: '#333',
    },
    timeSlotButtons: {
        flexDirection: 'row',
    },
    timeSlotDeleteButton: {
        padding: 5,
    },
    addTimeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#28a745',
        borderRadius: 5,
        marginBottom: 15,
    },
    addTimeButtonText: {
        fontSize: 16,
        color: '#28a745',
        marginLeft: 8,
    },
    reminderSubtext: {
        fontSize: 12,
        color: '#666',
        marginTop: 3,
        alignSelf: 'center',
    },
    selectedButton: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    selectedButtonText: {
        color: 'black',
        fontWeight: '500',
    },
    button2: {
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        alignItems: 'center',
        marginVertical: 4,
    },
    buttonText2: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 12,
    },
    splitBlockL: {
        flex: 1,
        marginRight: 5,
    },
    splitBlockR: {
        flex: 1,
        marginLeft: 5,
    },
    separator: {
        height: 1,
        backgroundColor: 'gray',
        width: '100%',
    },
    fabContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginLeft: 30,
    },
    fabButton: {
        backgroundColor: '#17a2b8',
        width: 60,
        height: 60,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    fabButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    cancelButton: {
        marginTop: 15,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#dc3545',
        borderRadius: 5,
        minWidth: 100,
        alignItems: 'center',
    },

    cancelButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});