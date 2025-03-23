import React, {useEffect, useState} from 'react';
import {MedicalPrescription} from "@/components/models/MedicalPrescription";
import {ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {UserDataService} from "@/components/services/UserDataService";
import * as ImagePicker from "expo-image-picker";
import {ImagePickerResult} from "expo-image-picker";
import {HttpService} from "@/components/services/HttpService";
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';

// Define types
interface TableItem extends MedicalPrescription {
    id: string;
}

export const PrescriptionsTable = () => {
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [editItem, setEditItem] = useState<TableItem | null>(null);
    const [editedValues, setEditedValues] = useState<MedicalPrescription>({
        name: '',
        usage: '',
        qty: 0,
        refills: 0,
        discard: '',
        note: ''
    });
    const [myPrescriptions, setMyPrescriptions] = useState<TableItem[]>([]);
    const [attachments, setAttachments] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Handler for edit button
    const handleEdit = (item: TableItem): void => {
        setEditItem(item);
        setEditedValues({
            name: item.name,
            usage: item.usage,
            qty: item.qty,
            refills: item.refills,
            discard: item.discard,
            note: item.note
        });
        setModalVisible(true);
    };

    // Handler for saving changes
    const handleSave = async (): Promise<void> => {
        if (editItem) {
            editItem.name = editedValues.name
            editItem.usage = editedValues.usage
            editItem.qty = editedValues.qty
            editItem.refills = editedValues.refills
            editItem.discard = editedValues.discard
            editItem.note = editedValues.note
        } else {
            myPrescriptions.push({
                id: Date.now().toString(),
                name: editedValues.name,
                usage: editedValues.usage,
                qty: editedValues.qty,
                refills: editedValues.refills,
                discard: editedValues.discard,
                note: editedValues.note,
            })
        }
        await UserDataService.save();
        setModalVisible(false);
    };

    // Handler for delete button
    const handleDelete = async (id: string): Promise<void> => {
        // Remove prescription at given index
        const removePrescriptionAt = async (index: number): Promise<void> => {
            if (index >= 0) {
                myPrescriptions.splice(index, 1);
                await UserDataService.save()
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
    const handleAdd = (value: MedicalPrescription): void => {
        setEditItem(null);
        setEditedValues(value);
        setModalVisible(true);
    };

    // Prompt user to add
    const promptAdd = (): void => {
        handleAdd({
            name: '',
            usage: '',
            qty: 0,
            refills: 0,
            discard: '',
            note: '',
        })
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
                    attachments.push(theBase64)
                }
            }
        }
        if (attachments.length > 0) {
            // Show loading spinner
            setIsLoading(true);
            try {
                const result: MedicalPrescription = (await HttpService.getImageText({
                    images: attachments
                })).data;
                // Trigger adding a new prescription from the parent component
                if (result.name) {
                    handleAdd(result);
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
            setMyPrescriptions(await UserDataService.try_get("Prescriptions", []))
        }

        fetchMyPrescriptions().then(); // Call the async function
    }, []);

// Header component
    const TableHeader: React.FC = () => (
        <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.nameColumn]}>Name</Text>
            <Text style={[styles.headerCell, styles.actionColumn]}>Action</Text>
        </View>
    );

    // Render item for list
    const renderItem = (item: TableItem, index: number): React.ReactElement => (
        <View style={styles.row} key={index}>
            <Text style={[styles.cell, styles.nameColumn]}>{item.name}</Text>
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

    // Convert Date to string in 'yyyy-mm-dd' format
    function dateToString(date: Date): string {
        const year = date.getFullYear();
        // getMonth() is zero-based, so add 1 and pad with a leading zero if needed
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

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
                    <TouchableOpacity style={styles.addButton} onPress={promptAdd}>
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

                        <Text style={styles.inputLabel}>Usage:</Text>
                        <TextInput
                            style={styles.input}
                            value={editedValues.usage}
                            onChangeText={(text: string) => setEditedValues({...editedValues, usage: text})}
                        />

                        <Text style={styles.inputLabel}>QTY:</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType='numeric'
                            value={editedValues.qty.toString()}
                            onChangeText={(text: string) => setEditedValues({
                                ...editedValues,
                                qty: text ? parseInt(text) : 0
                            })}
                        />

                        <Text style={styles.inputLabel}>Refills Remaining:</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType='numeric'
                            value={editedValues.refills.toString()}
                            onChangeText={(text: string) => setEditedValues({
                                ...editedValues,
                                refills: text ? parseInt(text) : 0
                            })}
                        />

                        <Text style={styles.inputLabel}>Date To Discard:</Text>
                        <DateTimePicker
                            value={editedValues.discard ? new Date(editedValues.discard) : new Date()}
                            onChange={(_, theDate: Date | undefined) => setEditedValues({
                                ...editedValues,
                                discard: theDate ? dateToString(theDate) : editedValues.discard
                            })}
                        />

                        <Text style={styles.inputLabel}>Note:</Text>
                        <TextInput
                            style={styles.input}
                            value={editedValues.note}
                            onChangeText={(text: string) => setEditedValues({...editedValues, note: text})}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonCancel]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonSave]}
                                onPress={handleSave}
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
    buttonSave: {
        backgroundColor: '#28a745',
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
});