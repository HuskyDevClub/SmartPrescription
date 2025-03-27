import React, {useEffect, useRef, useState} from 'react';
import {AbstractMedicalPrescription, MedicalPrescription} from "@/components/models/MedicalPrescription";
import {ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {UserDataService} from "@/components/services/UserDataService";
import * as ImagePicker from "expo-image-picker";
import {ImagePickerResult} from "expo-image-picker";
import {HttpService} from "@/components/services/HttpService";
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Notifications from 'expo-notifications';
import {SchedulableTriggerInputTypes} from 'expo-notifications';

interface TableItem extends AbstractMedicalPrescription {
    id: string;
    taken: number;
    skipped: number;
    reminderTimes: string[]; // Store time in 24-hour format (HH:MM)
    endAt: Date;
}

// Convert time string to display format (12-hour with AM/PM)
const formatTimeForDisplay = (timeString?: string): string => {
    if (!timeString) return 'No reminder';

    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM

    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const PrescriptionsTable = () => {
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [editItem, setEditItem] = useState<TableItem | null>(null);
    const [editedValues, setEditedValues] = useState<TableItem>({
        id: '',
        name: '',
        doseQty: 0,
        doseUnit: "",
        taken: 0,
        skipped: 0,
        reminderTimes: [],
        endAt: new Date(),
    });
    const [myPrescriptions, setMyPrescriptions] = useState<TableItem[]>([]);
    const [attachments, setAttachments] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

    // Reference to keep track of the most up-to-date prescriptions state
    const prescriptionsRef = useRef<TableItem[]>([]);

    // Update ref when state changes
    useEffect(() => {
        prescriptionsRef.current = myPrescriptions;
    }, [myPrescriptions]);

    // Handler for edit button
    const handleEdit = (item: TableItem): void => {
        setEditItem(item);
        setEditedValues({
            id: item.id,
            name: item.name,
            doseQty: item.doseQty,
            doseUnit: item.doseUnit,
            taken: item.taken,
            skipped: item.skipped,
            reminderTimes: item.reminderTimes,
            endAt: item.endAt,
        });
        setModalVisible(true);
    };

    // Handler for saving changes
    const handleSave = async (): Promise<void> => {
        if (editItem) {
            editItem.name = editedValues.name;
            editItem.doseQty = editedValues.doseQty;
            editItem.doseUnit = editedValues.doseUnit;
            editItem.taken = editedValues.taken;
            editItem.skipped = editedValues.skipped;
            editItem.reminderTimes = editedValues.reminderTimes;
            editItem.endAt = editedValues.endAt;

            // Cancel existing notifications
            await Notifications.cancelScheduledNotificationAsync(editItem.id);

            // Schedule new notifications for all reminder times
            await scheduleNotifications(editItem);
        } else {
            const newItem: TableItem = {
                ...editedValues,
                id: Date.now().toString(),
            };

            myPrescriptions.push(newItem);

            // Schedule notifications for new item
            await scheduleNotifications(newItem);
        }
        await UserDataService.save();
        setModalVisible(false);
    };

    // Handler for delete button
    const handleDelete = async (id: string): Promise<void> => {
        // Remove prescription at given index
        const removePrescriptionAt = async (index: number): Promise<void> => {
            if (index >= 0) {
                // Cancel all notifications for deleted item
                await cancelAllNotifications(id);

                myPrescriptions.splice(index, 1);
                await UserDataService.save();
                setEditItem({} as TableItem);
            }
        }
        // Alert user before removal
        Alert.alert('Warning', 'Are you sure you want to delete this item?', [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Confirm', onPress: async () => {
                    await removePrescriptionAt(myPrescriptions.findIndex(item => item.id === id));
                }
            },
        ]);
    };

    // Handler for add button
    const handleAdd = (): void => {
        setEditItem(null);
        setEditedValues({
            id: '',
            name: '',
            doseQty: 0,
            doseUnit: "",
            taken: 0,
            skipped: 0,
            reminderTimes: [],
            endAt: new Date()
        })
        setModalVisible(true);
    }

    // Handle medication taken action
    const handleMedicationTaken = async (id: string, notificationId: string): Promise<void> => {
        const prescriptions = prescriptionsRef.current;
        const index = prescriptions.findIndex(item => item.id === id);

        if (index >= 0) {
            // Increment taken count
            prescriptions[index].taken += 1;

            // Update state
            setMyPrescriptions([...prescriptions]);

            // Save to persistent storage
            await UserDataService.save();

            // Dismiss the notification
            await Notifications.dismissNotificationAsync(notificationId);
        }
    };

    // Handle medication skipped action
    const handleMedicationSkipped = async (id: string, notificationId: string): Promise<void> => {
        const prescriptions = prescriptionsRef.current;
        const index = prescriptions.findIndex(item => item.id === id);

        if (index >= 0) {
            // Increment skipped count
            prescriptions[index].skipped += 1;

            // Update state
            setMyPrescriptions([...prescriptions]);

            // Save to persistent storage
            await UserDataService.save();

            // Dismiss the notification
            await Notifications.dismissNotificationAsync(notificationId);
        }
    };

    // Cancel all notifications for a medication
    const cancelAllNotifications = async (id: string): Promise<void> => {
        for (const n of (await Notifications.getAllScheduledNotificationsAsync())) {
            if (n.identifier.startsWith(id)) {
                await Notifications.cancelScheduledNotificationAsync(n.identifier)
            }
        }
    };

    // Schedule notifications for all reminder times of a medication
    const scheduleNotifications = async (item: TableItem): Promise<void> => {
        if (!item.reminderTimes || item.reminderTimes.length === 0) return;

        // Cancel any existing notifications for this item
        await cancelAllNotifications(item.id);

        // Schedule a notification for each reminder time
        for (let i = 0; i < item.reminderTimes.length; i++) {
            const reminderTime = item.reminderTimes[i];
            // Parse the reminder time
            const [hours, minutes] = reminderTime.split(':').map(Number);

            // Schedule the notification
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Medication Reminder',
                    body: `Time to take your ${item.name}.`,
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    data: {id: item.id},
                    categoryIdentifier: 'medication-reminder',
                },
                trigger: {
                    type: SchedulableTriggerInputTypes.DAILY,
                    hour: hours,
                    minute: minutes
                },
                identifier: `${item.id}_time_${i}`
            });
        }
    }

    async function takePrescriptionPhoto(): Promise<void> {
        // Clear attachments
        setAttachments([])
        // Request permission
        await ImagePicker.requestCameraPermissionsAsync()
        // Launch camera for taking photo
        const result: ImagePickerResult = await ImagePicker.launchCameraAsync({
            base64: true,
            allowsEditing: true,
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
            allowsEditing: true,
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
                    attachments.push(theBase64)
                }
            }
        }
        if (attachments.length > 0) {
            // Show loading spinner
            setIsLoading(true);
            try {
                const result: MedicalPrescription[] = (await HttpService.getImageText(attachments)).data;
                console.log(result)
                // Trigger adding a new prescription from the parent component
                if (result) {
                    for (const p of result) {
                        const endAt: Date = new Date(p.createdAt);
                        endAt.setDate(endAt.getDate() + p.days);
                        const newItem: TableItem = {
                            ...p,
                            id: Date.now().toString(),
                            taken: 0,
                            skipped: 0,
                            reminderTimes: [],
                            endAt: endAt
                        };
                        // Add time according to Frequency
                        const frequencyTable: string[] = p.frequency.split("-")
                        if (frequencyTable.at(0) == "1") {
                            newItem.reminderTimes.push("08:00");
                        }
                        if (frequencyTable.at(1) == "1") {
                            newItem.reminderTimes.push("13:00");
                        }
                        if (frequencyTable.at(2) == "1") {
                            newItem.reminderTimes.push("18:00");
                        }
                        // Add item to existing prescriptions
                        myPrescriptions.push(newItem);
                        // Schedule notifications for new item
                        await scheduleNotifications(newItem);
                    }
                    await UserDataService.save();
                } else {
                    Alert.alert('Invalid Image', 'Please try again!');
                }
            } catch (error: any) {
                Alert.alert('Error', error.message);
            } finally {
                // Hide loading spinner regardless of success or failure
                setIsLoading(false);
            }
            setAttachments([])
        }
    }

    // Fetch my prescriptions when the component mounts
    useEffect(() => {
        async function fetchMyPrescriptions(): Promise<void> {
            const thePrescriptions: TableItem[] = await UserDataService.try_get("Prescriptions", []);
            setMyPrescriptions(thePrescriptions);
            prescriptionsRef.current = thePrescriptions;

            // Re-schedule notifications for all prescriptions with reminder times
            await Notifications.cancelAllScheduledNotificationsAsync();
            for (const p of thePrescriptions) {
                await scheduleNotifications(p);
            }

            // Log debug info
            if (__DEV__) {
                const allScheduledNotificationsAsync = await Notifications.getAllScheduledNotificationsAsync();
                if (allScheduledNotificationsAsync?.length > 0) {
                    console.log(`In total of ${allScheduledNotificationsAsync.length} notification(s):`);
                    allScheduledNotificationsAsync.forEach(n => console.log(n))
                } else {
                    console.log("No notification");
                }
            }
        }

        async function setupNotificationHandlers() {
            // Request notification permissions
            const {status} = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow notifications to receive medication reminders');
                return;
            }

            // Set notification categories with action buttons
            await Notifications.setNotificationCategoryAsync('medication-reminder', [
                {
                    identifier: 'TAKEN_ACTION',
                    buttonTitle: 'Taken',
                    options: {
                        isDestructive: false,
                        isAuthenticationRequired: false,
                    }
                },
                {
                    identifier: 'SKIP_ACTION',
                    buttonTitle: 'Skip',
                    options: {
                        isDestructive: false,
                        isAuthenticationRequired: false,
                    }
                }
            ]);

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
                const {id, notificationId} = notification.request.content.data;

                if (actionIdentifier === 'TAKEN_ACTION') {
                    handleMedicationTaken(id, notificationId);
                } else if (actionIdentifier === 'SKIP_ACTION') {
                    handleMedicationSkipped(id, notificationId);
                }
            });

            // Cleanup subscription on unmount
            return () => subscription.remove();
        }

        fetchMyPrescriptions().then();
        setupNotificationHandlers().then();
    }, []);

    // States for time picker
    const [editingTimeIndex, setEditingTimeIndex] = useState<number>(-1);

    // Handle time picker change
    const onTimeChange = (_: any, selectedTime?: Date) => {
        setShowTimePicker(false);
        if (selectedTime && editedValues.reminderTimes) {
            const hours = selectedTime.getHours().toString().padStart(2, '0');
            const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
            const timeString = `${hours}:${minutes}`;

            if (editingTimeIndex >= 0 && editingTimeIndex < editedValues.reminderTimes.length) {
                // Update existing time slot
                editedValues.reminderTimes[editingTimeIndex] = timeString;
            } else {
                editedValues.reminderTimes.push(timeString);
            }
        }
    };

    // Add a new time slot
    const addTimeSlot = (): void => {
        setEditingTimeIndex(-1); // Indicate we're adding a new slot
        setShowTimePicker(true);
    };

    // Edit an existing time slot
    const editTimeSlot = (index: number): void => {
        setEditingTimeIndex(index);
        setShowTimePicker(true);
    };

    // Remove a time slot
    const removeTimeSlot = (index: number): void => {
        if (editedValues.reminderTimes && editedValues.reminderTimes.length > index) {
            const updatedTimes = [...editedValues.reminderTimes];
            updatedTimes.splice(index, 1);
            setEditedValues({...editedValues, reminderTimes: updatedTimes});
        }
    };

    // Header component
    const TableHeader: React.FC = () => (
        <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.nameColumn]}>Name</Text>
            <Text style={[styles.headerCell, styles.reminderColumn]}>Reminder</Text>
            <Text style={[styles.headerCell, styles.actionColumn]}>Action</Text>
        </View>
    );

    // Render item for list
    const renderItem = (item: TableItem, index: number): React.ReactElement => (
        <View style={styles.row} key={index}>
            <Text style={[styles.cell, styles.nameColumn]}>{item.name}</Text>
            <TouchableOpacity
                style={[styles.cell, styles.reminderColumn]}
                onPress={() => handleEdit(item)}
            >
                <Text style={styles.reminderSubtext}>
                    {item.reminderTimes.map(time => formatTimeForDisplay(time)).join(', ')}
                </Text>
            </TouchableOpacity>
            <View style={[styles.cell, styles.actionColumn, styles.buttonContainer]}>
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEdit(item)}
                >
                    <Text style={styles.buttonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id)}
                >
                    <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Add this Modal component to your render function
    const LoadingModal = () => (
        <Modal
            transparent={true}
            animationType="fade"
            visible={isLoading}
            onRequestClose={() => {
            }} // Required on Android
        >
            <View style={styles.modalBackground}>
                <View style={styles.spinnerContainer}>
                    <ActivityIndicator
                        size="large"
                        color="#0275d8" // Bootstrap primary blue
                    />
                    <Text style={styles.loadingText}>Processing prescription...</Text>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.addButton} onPress={takePrescriptionPhoto}>
                        <Ionicons name="camera" size={20} color="white"/>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addButton} onPress={selectPrescriptionPhoto}>
                        <Ionicons name="image" size={20} color="white"/>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                        <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <LoadingModal/>

            <View style={styles.headerContainer}>
                <TableHeader/>
            </View>

            {myPrescriptions.map((p, i) => renderItem(p, i))}

            {/* Edit Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>{editItem ? 'Edit Item' : 'Add New Item'}</Text>

                        <Text style={styles.inputLabel}>Name:</Text>
                        <TextInput
                            style={styles.input}
                            value={editedValues.name}
                            onChangeText={(text: string) => setEditedValues({...editedValues, name: text})}
                        />

                        <Text style={styles.inputLabel}>Dose Qty:</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType='numeric'
                            value={editedValues.doseQty.toString()}
                            onChangeText={(text: string) => setEditedValues({
                                ...editedValues,
                                doseQty: text ? parseInt(text) : 0
                            })}
                        />

                        <Text style={styles.inputLabel}>Dose Unit:</Text>
                        <TextInput
                            style={styles.input}
                            value={editedValues.doseUnit}
                            onChangeText={(text: string) => setEditedValues({...editedValues, doseUnit: text})}
                        />

                        <Text style={styles.inputLabel}>End At:</Text>
                        <DateTimePicker
                            value={new Date(editedValues.endAt)}
                            onChange={(_, theDate: Date | undefined) => setEditedValues({
                                ...editedValues,
                                endAt: new Date(theDate ? theDate : editedValues.endAt)
                            })}
                        />

                        <Text style={styles.inputLabel}>Taken:</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType='numeric'
                            value={editedValues.taken.toString()}
                            onChangeText={(text: string) => setEditedValues({
                                ...editedValues,
                                taken: text ? parseInt(text) : 0
                            })}
                        />

                        <Text style={styles.inputLabel}>Skip:</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType='numeric'
                            value={editedValues.skipped.toString()}
                            onChangeText={(text: string) => setEditedValues({
                                ...editedValues,
                                skipped: text ? parseInt(text) : 0
                            })}
                        />

                        <Text style={styles.inputLabel}>Reminder Times:</Text>

                        {/* List of existing time slots */}
                        {editedValues.reminderTimes && editedValues.reminderTimes.map((time, idx) => (
                            <View key={idx} style={styles.timeSlotContainer}>
                                <Text style={styles.timeSlotText}>
                                    {formatTimeForDisplay(time)}
                                </Text>
                                <View style={styles.timeSlotButtons}>
                                    <TouchableOpacity
                                        style={styles.timeSlotEditButton}
                                        onPress={() => editTimeSlot(idx)}
                                    >
                                        <Ionicons name="pencil" size={18} color="#007BFF"/>
                                    </TouchableOpacity>
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
                            onPress={addTimeSlot}
                        >
                            <Ionicons name="add-circle" size={20} color="#28a745"/>
                            <Text style={styles.addTimeButtonText}>Add Time Slot</Text>
                        </TouchableOpacity>

                        {/* Time picker (shown when adding/editing a time) */}
                        {showTimePicker && (
                            <DateTimePicker
                                value={(() => {
                                    const date = new Date();
                                    if (editingTimeIndex >= 0 &&
                                        editedValues.reminderTimes &&
                                        editedValues.reminderTimes[editingTimeIndex]) {
                                        const [hours, minutes] = editedValues.reminderTimes[editingTimeIndex].split(':').map(Number);
                                        date.setHours(hours, minutes, 0, 0);
                                    }
                                    return date;
                                })()}
                                mode="time"
                                is24Hour={false}
                                display="default"
                                onChange={onTimeChange}
                            />
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonCancel]}
                                onPress={() => setModalVisible(false)}
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
                    </View>
                </View>
            </Modal>
        </View>
    )
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#f5f5f5',
    },
    headerContainer: {
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
        marginVertical: 2,
        borderRadius: 5,
        alignItems: 'center',
    },
    cell: {
        padding: 5,
        textAlign: 'center',
    },
    nameColumn: {
        flex: 2,
    },
    reminderColumn: {
        flex: 1.5,
    },
    noteColumn: {
        flex: 3,
    },
    actionColumn: {
        flex: 1.5,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    editButton: {
        backgroundColor: '#28a745',
        padding: 6,
        borderRadius: 5,
        marginHorizontal: 2,
    },
    deleteButton: {
        backgroundColor: '#dc3545',
        padding: 6,
        borderRadius: 5,
        marginHorizontal: 2,
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
    addButton: {
        backgroundColor: '#17a2b8',
        padding: 10,
        borderRadius: 5,
        flex: 1,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    addButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
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
    timeSlotEditButton: {
        padding: 5,
        marginRight: 5,
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
    reminderText: {
        fontSize: 14,
    },
    reminderSubtext: {
        fontSize: 12,
        color: '#666',
        marginTop: 3,
    },
});