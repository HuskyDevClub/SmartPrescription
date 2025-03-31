import React, {useEffect, useState} from 'react';
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
import {HttpService} from "@/components/services/HttpService";
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Notifications from 'expo-notifications';
import {PrescriptionService} from "@/components/services/PrescriptionService";
import {DateService} from "@/components/services/DateService";

export const PrescriptionsTable = () => {
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [editItem, setEditItem] = useState<PrescriptionRecord | null>(null);
    const [editedValues, setEditedValues] = useState<PrescriptionRecord>(PrescriptionService.new());
    const [attachments, setAttachments] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
    const [forceUpdate, setForceUpdate] = useState<boolean>(false);

    // Handler for edit button
    const handleEdit = (item: PrescriptionRecord): void => {
        setEditItem(item);
        setEditedValues({...item});
        setModalVisible(true);
    };

    // Handler for saving changes
    const handleSave = async (): Promise<void> => {
        if (editItem) {
            editItem.name = editedValues.name;
            editItem.type = editedValues.type;
            editItem.dosage = editedValues.dosage;
            editItem.food = editedValues.food;
            editItem.taken = editedValues.taken;
            editItem.skipped = editedValues.skipped;
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
                        const newItem: PrescriptionRecord = {
                            ...p,
                            id: Date.now().toString(),
                            taken: 0,
                            skipped: 0,
                            reminderTimes: [],
                            startAt: new Date(p.createdAt),
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
                        // Schedule notifications for new item
                        await PrescriptionService.addPrescription(newItem);
                    }
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
                    PrescriptionService.handleMedicationTaken(id, notificationId);
                } else if (actionIdentifier === 'SKIP_ACTION') {
                    PrescriptionService.handleMedicationSkipped(id, notificationId);
                }
            });

            // Cleanup subscription on unmount
            return () => subscription.remove();
        }

        PrescriptionService.init().then(_ => setForceUpdate(!forceUpdate));
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

    // Render expired prescriptions
    const RenderExpire: React.FC = () => {
        const expiredPrescription: PrescriptionRecord[] = PrescriptionService.getExpiredPrescriptions()
        if (expiredPrescription.length == 0) {
            return (<View/>);
        }
        return (
            <View>
                <Text style={[styles.modalTitle, {marginTop: 15}]}>Expired</Text>
                {expiredPrescription.map((p, i) => renderItem(p, i))}
            </View>
        )
    }

    // Header component
    const TableHeader: React.FC = () => (
        <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.nameColumn]}>Name</Text>
            <Text style={[styles.headerCell, styles.reminderColumn]}>Reminder</Text>
            <Text style={[styles.headerCell, styles.actionColumn]}>Action</Text>
        </View>
    );

    // Render item for list
    const renderItem = (item: PrescriptionRecord, index: number): React.ReactElement => (
        <View style={styles.row} key={index}>
            <Text style={[styles.cell, styles.nameColumn]}>{item.name}</Text>
            <TouchableOpacity
                style={[styles.cell, styles.reminderColumn]}
                onPress={() => handleEdit(item)}
            >
                <Text style={styles.reminderSubtext}>
                    {item.reminderTimes.map(time => DateService.formatTimeForDisplay(time)).join(', ')}
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
            <Text style={styles.title}>My Pill</Text>
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

            {PrescriptionService.getNotExpiredPrescriptions().map((p, i) => renderItem(p, i))}

            <RenderExpire/>

            {/* Edit Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={styles.centeredView}>
                    <ScrollView style={styles.modalView}>
                        <Text style={styles.modalTitle}>{editItem ? 'Edit Item' : 'Add New Item'}</Text>

                        <Text style={styles.inputLabel}>Name:</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <TextInput
                                style={[styles.input, {flex: 6}]}
                                value={editedValues.name}
                                onChangeText={(text: string) => setEditedValues({...editedValues, name: text})}
                            />
                            <TouchableOpacity
                                style={{flex: 1, alignItems: 'center'}}
                                onPress={() => Linking.openURL(`https://www.google.com/search?q=${editedValues.name}`)}
                            >
                                <Ionicons name="link" size={28} color="blue"/>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Type:</Text>
                        <TextInput
                            style={styles.input}
                            value={editedValues.type}
                            onChangeText={(text: string) => setEditedValues({...editedValues, type: text})}
                        />

                        <Text style={styles.inputLabel}>Dosage:</Text>
                        <TextInput
                            style={styles.input}
                            value={editedValues.dosage}
                            onChangeText={(text: string) => setEditedValues({...editedValues, dosage: text})}
                        />

                        <Text style={styles.inputLabel}>Food:</Text>
                        <View style={styles.buttonContainer}>
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
                        </View>
                        <View style={[styles.buttonContainer, {marginTop: 15}]}>
                            <View style={styles.splitBlockL}>
                                <Text style={styles.inputLabel}>Start At:</Text>
                                <DateTimePicker
                                    value={new Date(editedValues.startAt)}
                                    onChange={(_, theDate: Date | undefined) => setEditedValues({
                                        ...editedValues,
                                        startAt: new Date(theDate ? theDate : editedValues.startAt)
                                    })}
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
                                />
                            </View>
                        </View>
                        <View style={[styles.buttonContainer, {marginTop: 15}]}>
                            <View style={styles.splitBlockL}>
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
                            </View>
                            <View style={styles.splitBlockR}>
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
                            </View>
                        </View>

                        <Text style={styles.inputLabel}>Reminder Times:</Text>

                        {/* List of existing time slots */}
                        {editedValues.reminderTimes && editedValues.reminderTimes.map((time, idx) => (
                            <View key={idx} style={styles.timeSlotContainer}>
                                <Text style={styles.timeSlotText}>
                                    {DateService.formatTimeForDisplay(time)}
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
    selectedButton: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    selectedButtonText: {
        color: 'black',
        fontWeight: '500',
    },
    button2: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        marginHorizontal: 4,
        alignItems: 'center',
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
});