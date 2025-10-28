import React, { useCallback, useEffect, useState } from 'react';
import { MedicalPrescription, PrescriptionRecord } from "@/components/models/MedicalPrescription";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserDataService } from "@/components/services/UserDataService";
import * as ImagePicker from "expo-image-picker";
import { ImagePickerResult } from "expo-image-picker";
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Notifications from 'expo-notifications';
import { PrescriptionService } from "@/components/services/PrescriptionService";
import { DateService } from "@/components/services/DateService";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { SettingsService } from "@/components/services/SettingsService";
import { useFocusEffect, useRouter } from "expo-router";
import { ReminderTime } from "@/components/models/ReminderTime"
import { API_BASE_URL, AuthService } from "./services/AuthService";

export const PrescriptionsTable = () => {
    const router = useRouter();
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [editItem, setEditItem] = useState<PrescriptionRecord | null>(null);
    const [editedValues, setEditedValues] = useState<PrescriptionRecord>(PrescriptionService.new());
    const [attachments, setAttachments] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [editingTimeIndex, setEditingTimeIndex] = useState<number>(-1);
    const [refreshFlag, setRefreshFlag] = useState<boolean>(false);
    const [updateFlag, setUpdateFlag] = useState<boolean>(false);
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    // Handler for edit button
    const handleEdit = (item: PrescriptionRecord): void => {
        setEditItem(item);
        setEditedValues(JSON.parse(JSON.stringify(item)) as PrescriptionRecord);
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

    // Show a login /register prompt
    const showAuthPrompt = (feature: string): void => {
        Alert.alert(
            'Login Required',
            `Please sign in or create an account to use the ${feature} feature.`,
            [
                {
                    text: 'Cancel',
                },
                {
                    text: 'Sign In',
                    onPress: () => {
                        // Navigate to the settings page where auth is handled
                        router.push('/(tabs)/settings');
                    }
                },
                {
                    text: 'Create Account',
                    onPress: () => {
                        // Navigate to the settings page where auth is handled
                        router.push('/(tabs)/settings');
                    },
                },
            ]
        );
    };


    async function takePrescriptionPhoto(): Promise<void> {
        // Check authentication first
        if (!isAuthenticated) {
            showAuthPrompt('camera');
            return;
        }

        // Clear attachments
        setAttachments([])
        // Request permission
        await ImagePicker.requestCameraPermissionsAsync()
        // Launch camera for taking a photo
        const result: ImagePickerResult = await ImagePicker.launchCameraAsync({
            base64: true,
        });
        // Process image if any photo was taken
        if (!result.canceled) {
            await sendSelectPrescriptionPhoto(result)
        }
    }

    async function selectPrescriptionPhoto(): Promise<void> {
        // Check authentication first
        if (!isAuthenticated) {
            showAuthPrompt('photo upload');
            return;
        }

        // Clear attachments
        setAttachments([])
        // Request permission
        await ImagePicker.requestMediaLibraryPermissionsAsync()
        // Prompt user for selecting a photo
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

                // Create a promise that resolves when the user cancels
                const abortPromise = new Promise((_, reject) => {
                    controller.signal.addEventListener('abort', () => {
                        reject(new Error('Operation cancelled by user'));
                    });
                });

                // Get authentication token
                const token = AuthService.getToken();
                if (!token) {
                    return Alert.alert('Authentication token not found. Please login again.');
                }

                // Create headers with authentication
                const headers: Record<string, string> = {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                };

                // Create the fetch promise with abort signal
                const getImageText = fetch(`${API_BASE_URL}/ai/parseDrugsImage`, {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify({base64: attachments[0]}),
                    signal: controller.signal, // Pass the abort signal directly to fetch
                });

                // Race between the API call and the abort operation
                const response: any = await Promise.race([getImageText, abortPromise]);

                // Check for authentication errors
                if (response.status === 401) {
                    // Logout and prompt to log in again
                    await AuthService.logout();
                    setIsAuthenticated(false);
                    return Alert.alert(
                        'Session Expired',
                        'Your session has expired. Please login again to use photo features.',
                        [
                            {text: 'OK', onPress: () => router.push('/(tabs)/settings')}
                        ]
                    );
                }

                if (!response.ok && response.status !== 200) {
                    return Alert.alert(`Server error: ${response.status}`);
                }

                // Parse the response body
                const data = await response.json();

                // Rest of your existing processing logic...
                if (__DEV__) {
                    console.log(data)
                    if (data.error) {
                        console.log(data.error)
                    } else {
                        console.log(data.choices[0].message?.content)
                    }
                }
                const result: Record<string, MedicalPrescription> = JSON.parse(data.choices[0].message?.content)
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
                                endAt: endAt,
                                archived: false,
                            };
                            // Add time according to Frequency
                            const frequencyTable: string[] = p.frequency.split("-")
                            if (frequencyTable.at(0) === "1") {
                                newItem.reminderTimes.push({...SettingsService.current.breakfastTime});
                            }
                            if (frequencyTable.at(1) === "1") {
                                newItem.reminderTimes.push({...SettingsService.current.lunchTime});
                            }
                            if (frequencyTable.at(2) === "1") {
                                newItem.reminderTimes.push({...SettingsService.current.dinnerTime});
                            }
                            // Schedule notifications for the new item
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
                // Hide the loading spinner regardless of success or failure
                setIsLoading(false);
                setAbortController(null);
            }
            setAttachments([])
        }
    }

    useFocusEffect(
        useCallback(() => {
            // Check authentication status when the page comes into focus
            AuthService.init().then(() => {
                setIsAuthenticated(AuthService.isAuthenticated());
            });
            // Reset the update flag
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
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                    shouldShowBanner: true,
                    shouldShowList: true,
                }),
            });

            // Set up a notification response handler for action buttons
            const subscription = Notifications.addNotificationResponseReceivedListener(response => {
                const {actionIdentifier, notification} = response;
                const {id, notificationId, intendedTakenTime} = notification.request.content.data;

                if (actionIdentifier === 'TAKEN_ACTION') {
                    PrescriptionService.handleMedicationTaken(id, notificationId).then(() => setRefreshFlag(!refreshFlag));
                } else if (actionIdentifier === 'SNOOZE_ACTION') {
                    PrescriptionService.snoozeMedicationTaken(id, notificationId, intendedTakenTime)
                } else if (actionIdentifier === 'SKIP_ACTION') {
                    // Dismiss the notification
                    if (typeof (notificationId) == "string") {
                        Notifications.dismissNotificationAsync(notificationId)
                    }
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
            const theTimeKey: string = `${reminder.hours}:${reminder.minutes}`
            const existingReminder = uniqueTimes.get(theTimeKey);

            // If this time doesn't exist in our map yet, add it
            if (!existingReminder) {
                uniqueTimes.set(theTimeKey, reminder);
            }
            // If this time exists but the current reminder has a label and the existing one doesn't, replace it
            else if (reminder.label && !existingReminder.label) {
                uniqueTimes.set(theTimeKey, reminder);
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
        // Filter out times that match the reminder's hour and minute
        return taken.filter(dateStr => {
            const date = new Date(dateStr);
            const hour = date.getHours();
            const minute = date.getMinutes();

            // Return false to filter out matching times (same hour and minute)
            return !(hour === reminderTime.hours && minute === reminderTime.minutes);
        });
    }

    const startEditingTimeIndex = (idx: number): void => {
        setEditingTimeIndex(idx)
        editedValues.reminderTimes = getUniqueReminderTimes(editedValues.reminderTimes)
    }

    // Handle time picker change
    const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date): void => {
        if (event.type === "dismissed") {
            startEditingTimeIndex(-1)
        } else if (event.type === "set" && selectedTime) {
            const theReminderTime: ReminderTime = DateService.getTime(selectedTime);
            if (editingTimeIndex >= 0 && editingTimeIndex < editedValues.reminderTimes.length) {
                // Update existing time slot
                editedValues.reminderTimes[editingTimeIndex] = {
                    ...theReminderTime,
                    label: editedValues.reminderTimes[editingTimeIndex].label
                };
            } else {
                editedValues.reminderTimes.push(theReminderTime);
            }
            if (Platform.OS !== 'ios') {
                startEditingTimeIndex(-1)
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

    // Render expired prescription(s)
    const RenderArchivedPrescriptions: React.FC = () => {
        const expiredPrescriptions: PrescriptionRecord[] = PrescriptionService.getArchivedPrescriptions()
        if (expiredPrescriptions.length === 0) {
            return (<View/>);
        }
        return (
            <View style={styles.container}>
                <Text style={styles.modalTitle}>{`Past Medicine${expiredPrescriptions.length === 1 ? '' : 's'}`}</Text>
                <TableHeader/>
                <GestureHandlerRootView>
                    {expiredPrescriptions.map((p, i) => renderItem(p, i))}
                </GestureHandlerRootView>
            </View>
        )
    }

    // Render active prescription(s)
    const RenderActivePrescriptions: React.FC = () => {
        const activePrescriptions: PrescriptionRecord[] = PrescriptionService.getActivePrescriptions()
        if (activePrescriptions.length === 0) {
            return (<View/>);
        }
        return (
            <GestureHandlerRootView>
                {activePrescriptions.map((p, i) => renderItem(p, i))}
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

    // Render item for the given list
    const renderItem = (item: PrescriptionRecord, index: number): React.ReactElement => {

        function RightAction(_: SharedValue<number>, drag: SharedValue<number>) {
            const styleAnimation = useAnimatedStyle(() => {
                return {
                    transform: [{translateX: drag.value + 160}], // Increased width for two equal buttons
                };
            });
            // @ts-ignore
            return (
                <Animated.View style={styleAnimation}>
                    <View style={{flexDirection: 'row', height: "100%"}}>
                        {/* Archive button */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#17a2b8', // Using the teal color from your existing styles
                                width: 80,
                                height: '100%',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                            onPress={async () => {
                                item.archived = !item.archived;
                                await UserDataService.save();
                                setRefreshFlag(!refreshFlag);
                            }}
                        >
                            <MaterialIcons name={item.archived ? "unarchive" : "archive"} size={25} color="white"/>
                        </TouchableOpacity>

                        {/* Delete button */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: 'red',
                                width: 80,
                                height: '100%',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                            onPress={() => handleDelete(item.id)}
                        >
                            <MaterialIcons name="delete" size={25} color="white"/>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            );
        }

        return (
            <View key={index}>
                <ReanimatedSwipeable friction={2}
                                     enableTrackpadTwoFingerGesture
                                     rightThreshold={80} // Adjusted threshold to match button width
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
                                style={[styles.cell, styles.nameColumn, {color: PrescriptionService.isPrescriptionExpired(item) ? "red" : "black"}]}>{item.dosage.length > 0 ? `${item.name} (${item.dosage})` : item.name}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.cell, styles.subColumn]}
                            onPress={() => handleEdit(item)}
                        >
                            <Text style={styles.reminderSubtext}>
                                {item.reminderTimes.length > 0 ? item.reminderTimes.map(timeObj => DateService.formatTimeForDisplay(timeObj)).join(', ') : "-"}
                            </Text>
                        </TouchableOpacity>
                        <View
                            style={[styles.cell, styles.subColumn]}
                        >
                            <Text style={[styles.cell, {color: "green"}]}>
                                {item.taken.length}
                            </Text>
                        </View>
                        <View
                            style={[styles.cell, styles.subColumn]}
                        >
                            <Text style={[styles.cell, {color: "red"}]}>
                                {PrescriptionService.calculateDosesTakenSoFar(item) - item.taken.filter(t => {
                                    const takenTime = new Date(t);
                                    return item.reminderTimes.find(rt => rt.minutes === takenTime.getMinutes() && rt.hours === takenTime.getHours())
                                }).length}
                            </Text>
                        </View>
                    </View>
                </ReanimatedSwipeable>
                <View style={styles.separator}/>
            </View>
        );
    }

    return (
        <View>
            <View style={styles.container}>
                <View style={{flexDirection: 'row'}}>
                    <Text style={styles.title}>MyPill</Text>
                    <View style={styles.fabContainer}>
                        <TouchableOpacity style={[styles.fabButton, {backgroundColor: "#059669"}]}
                                          onPress={takePrescriptionPhoto}>
                            <MaterialIcons name="camera" size={40} color="white"/>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.fabButton, {backgroundColor: "#C2410C"}]}
                                          onPress={selectPrescriptionPhoto}>
                            <MaterialIcons name="image" size={40} color="white"/>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.fabButton, {backgroundColor: "#78716C"}]} onPress={handleAdd}>
                            <MaterialIcons name="add" size={40} color="white"/>
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

                {PrescriptionService.getActivePrescriptions().length > 0 && (
                    <View style={styles.headerContainer}>
                        <TableHeader/>
                    </View>)
                }

                <RenderActivePrescriptions/>

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
                                  <MaterialIcons name="link" size={28} color="blue"/>
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

                            <Text style={styles.inputLabel}>Start At:</Text>
                            <View style={{marginBottom: 10}}>
                                {Platform.OS === 'ios' ? (
                                    <DateTimePicker
                                        value={new Date(editedValues.startAt)}
                                        onChange={(_, theDate: Date | undefined) => setEditedValues({
                                            ...editedValues,
                                            startAt: new Date(theDate ? theDate : editedValues.startAt)
                                        })}
                                        maximumDate={new Date(editedValues.endAt)}
                                    />
                                ) : (
                                    <TouchableOpacity
                                        style={styles.timeButton}
                                        onPress={() => {
                                            DateTimePickerAndroid.open({
                                                value: new Date(editedValues.startAt),
                                                maximumDate: new Date(editedValues.endAt),
                                                onChange: (event: DateTimePickerEvent, selectedDate: Date | undefined) => {
                                                    if (event.type === "set" && selectedDate) {
                                                        setEditedValues({
                                                            ...editedValues,
                                                            startAt: new Date(selectedDate)
                                                        })
                                                    }
                                                }
                                            });
                                        }}
                                    >
                                        <Text>
                                            {new Date(editedValues.startAt).toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </Text>
                                    </TouchableOpacity>)}
                            </View>

                            <Text style={styles.inputLabel}>End At:</Text>
                            <View style={{marginBottom: 10}}>
                                {Platform.OS === 'ios' ? (
                                    <DateTimePicker
                                        value={new Date(editedValues.endAt)}
                                        onChange={(_, theDate: Date | undefined) => setEditedValues({
                                            ...editedValues,
                                            endAt: new Date(theDate ? theDate : editedValues.endAt)
                                        })}
                                        minimumDate={new Date(editedValues.startAt)}
                                    />
                                ) : (
                                    <TouchableOpacity
                                        style={styles.timeButton}
                                        onPress={() => {
                                            DateTimePickerAndroid.open({
                                                value: new Date(editedValues.endAt),
                                                minimumDate: new Date(editedValues.startAt),
                                                onChange: (event: DateTimePickerEvent, selectedDate: Date | undefined) => {
                                                    if (event.type === "set" && selectedDate) {
                                                        setEditedValues({
                                                            ...editedValues,
                                                            endAt: new Date(selectedDate)
                                                        })
                                                    }
                                                }
                                            });
                                        }}
                                    >
                                        <Text>
                                            {new Date(editedValues.endAt).toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </Text>
                                    </TouchableOpacity>)}
                            </View>

                            <Text style={styles.inputLabel}>Reminder Times:</Text>

                            {/* List of existing time slots */}
                            {editedValues.reminderTimes && editedValues.reminderTimes.map((timeObj, idx) => (
                                <View key={idx} style={styles.timeSlotContainer}>
                                    {/* Time picker (shown when adding/editing a time) */}
                                    {editingTimeIndex === idx ? (
                                        <DateTimePicker
                                            value={(() => {
                                                const date = new Date();
                                                if (editingTimeIndex >= 0 &&
                                                    editedValues.reminderTimes &&
                                                    editedValues.reminderTimes[editingTimeIndex]) {
                                                    date.setHours(editedValues.reminderTimes[editingTimeIndex].hours, editedValues.reminderTimes[editingTimeIndex].minutes, 0, 0);
                                                }
                                                return date;
                                            })()}
                                            mode="time"
                                            is24Hour={false}
                                            onChange={onTimeChange}
                                        />
                                    ) : (
                                        <TouchableOpacity onPress={() => startEditingTimeIndex(idx)}>
                                            <Text style={styles.timeSlotText}>
                                                {DateService.formatTimeForDisplay(timeObj)}
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
                                            <MaterialIcons name="delete" size={18} color="#dc3545"/>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}

                            {/* Add a new time slot button */}
                            <TouchableOpacity
                                style={styles.addTimeButton}
                                onPress={() => {
                                    editedValues.reminderTimes.push(DateService.getTime());
                                    setEditingTimeIndex(editedValues.reminderTimes.length - 1)
                                }}
                            >
                                <MaterialIcons name="add-circle" size={20} color="#28a745"/>
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
            <RenderArchivedPrescriptions/>
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dim the screen with a semi-transparent background
        justifyContent: 'center',
        alignItems: 'center',
    },
    spinnerContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 200, // Add some minimum width for a better layout
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
    timeButton: {
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 6,
        alignItems: 'center',
    }
});