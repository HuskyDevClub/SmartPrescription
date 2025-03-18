import React, {forwardRef, useEffect, useImperativeHandle, useState} from 'react';
import {MedicalPrescription} from "./models/MedicalPrescription";
import {Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {UserData} from "./UserData";

// Define types
interface TableItem extends MedicalPrescription {
    id: string;
}

// Define handle type for the ref
export interface PrescriptionsTableHandle {
    handleAdd: (value: MedicalPrescription) => void;
}

export const PrescriptionsTable = forwardRef<PrescriptionsTableHandle>((_, ref) => {
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [editItem, setEditItem] = useState<TableItem | null>(null);
    const [editedValues, setEditedValues] = useState<MedicalPrescription>({
        name: '',
        usage: '',
        frequency: '',
        note: '',
    });
    const [myPrescriptions, setMyPrescriptions] = useState<TableItem[]>([]);

    // Handler for edit button
    const handleEdit = (item: TableItem): void => {
        setEditItem(item);
        setEditedValues({
            name: item.name,
            usage: item.usage,
            frequency: item.frequency,
            note: item.note,
        });
        setModalVisible(true);
    };

    // Handler for saving changes
    const handleSave = async (): Promise<void> => {
        if (editItem) {
            editItem.name = editedValues.name
            editItem.usage = editedValues.usage
            editItem.frequency = editedValues.frequency
            editItem.note = editedValues.note
        } else {
            myPrescriptions.push({
                id: Date.now().toString(),
                name: editedValues.name,
                usage: editedValues.usage,
                frequency: editedValues.frequency,
                note: editedValues.note,
            })
        }
        await UserData.save();
        setModalVisible(false);
    };

    // Handler for delete button
    const handleDelete = async (id: string): Promise<void> => {
        // Remove prescription at given index
        const removePrescriptionAt = async (index: number): Promise<void> => {
            if (index >= 0) {
                myPrescriptions.splice(index, 1);
                await UserData.save()
                console.log(myPrescriptions);
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
            frequency: '',
            note: '',
        })
    }

    // Expose functions via ref
    useImperativeHandle(ref, () => ({
        handleAdd
    }));

    // Fetch my prescriptions when the component mounts
    useEffect(() => {
        async function fetchMyPrescriptions(): Promise<void> {
            setMyPrescriptions(await UserData.try_get("Prescriptions", []))
        }

        fetchMyPrescriptions().then(); // Call the async function
    }, []);

// Header component
    const TableHeader: React.FC = () => (
        <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.nameColumn]}>Name</Text>
            <Text style={[styles.headerCell, styles.usageColumn]}>Usage</Text>
            <Text style={[styles.headerCell, styles.frequencyColumn]}>Frequency</Text>
            <Text style={[styles.headerCell, styles.noteColumn]}>Note</Text>
            <Text style={[styles.headerCell, styles.actionColumn]}>Action</Text>
        </View>
    );

    // Render item for list
    const renderItem = (item: TableItem, index: number): React.ReactElement => (
        <View style={styles.row} key={index}>
            <Text style={[styles.cell, styles.nameColumn]}>{item.name}</Text>
            <Text style={[styles.cell, styles.usageColumn]}>{item.usage}</Text>
            <Text style={[styles.cell, styles.frequencyColumn]}>{item.frequency}</Text>
            <Text style={[styles.cell, styles.noteColumn]}>{item.note}</Text>
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

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <TableHeader/>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={promptAdd}
                >
                    <Text style={styles.addButtonText}>+ Add New</Text>
                </TouchableOpacity>
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

                        <Text style={styles.inputLabel}>Frequency:</Text>
                        <TextInput
                            style={styles.input}
                            value={editedValues.frequency}
                            onChangeText={(text: string) => setEditedValues({...editedValues, frequency: text})}
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
})


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
    usageColumn: {
        flex: 2,
    },
    frequencyColumn: {
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
        alignSelf: 'flex-end',
        marginTop: 10,
    },
    addButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});