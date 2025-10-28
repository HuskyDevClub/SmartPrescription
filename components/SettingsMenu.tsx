import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SettingsService, ThreeMeals } from "@/components/services/SettingsService";
import { PrescriptionService } from "@/components/services/PrescriptionService";
import { useFocusEffect } from "expo-router";
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { AuthService } from "@/components/services/AuthService";

type AccountViewMode = 'collapsed' | 'login' | 'register' | 'manage';

export const SettingsMenu = () => {

    const minSnoozeTime: number = 5;

    const [refreshFlag, setRefreshFlag] = useState<boolean>(false);
    const [updateFlag, setUpdateFlag] = useState<boolean>(false);

    // Account view mode
    const [accountViewMode, setAccountViewMode] = useState<AccountViewMode>('collapsed');

    // Auth fields
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [currentPassword, setCurrentPassword] = useState<string>("");
    const [newPassword, setNewPassword] = useState<string>("");
    const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");

    const [authLoading, setAuthLoading] = useState<boolean>(false);
    const [authError, setAuthError] = useState<string>("");
    const [successMessage, setSuccessMessage] = useState<string>("");
    const [showChangePassword, setShowChangePassword] = useState<boolean>(false);

    useFocusEffect(
        useCallback(() => {
            setUpdateFlag(prevState => !prevState)
            return () => {
            };
        }, [])
    );

    useEffect(() => {
        async function init(): Promise<void> {
            await Promise.all([SettingsService.init(), AuthService.init()]);
            // Set the initial account view based on auth status
            if (AuthService.isAuthenticated()) {
                setAccountViewMode('manage');
            } else {
                setAccountViewMode('collapsed');
            }
            setRefreshFlag(!refreshFlag);
        }

        init().then()
    }, [updateFlag])

    // Clear messages
    const clearMessages = () => {
        setAuthError("");
        setSuccessMessage("");
    };

    // Handle login
    const handleLogin = async () => {
        clearMessages();

        if (!email.trim() || !password) {
            setAuthError("Please enter both email and password");
            return;
        }

        setAuthLoading(true);
        try {
            await AuthService.login(email.trim(), password);
            setEmail("");
            setPassword("");
            setAccountViewMode('manage');
            setSuccessMessage("Successfully logged in!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (e: any) {
            setAuthError(e?.message || 'Login failed');
        } finally {
            setAuthLoading(false);
            setRefreshFlag(!refreshFlag);
        }
    };

    // Handle register
    const handleRegister = async () => {
        clearMessages();

        if (!email.trim() || !password || !confirmPassword) {
            setAuthError("Please fill in all fields");
            return;
        }

        if (password !== confirmPassword) {
            setAuthError("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setAuthError("Password must be at least 6 characters long");
            return;
        }

        setAuthLoading(true);
        try {
            await AuthService.register(email.trim(), password);
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setAccountViewMode('manage');
            setSuccessMessage("Account created successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (e: any) {
            setAuthError(e?.message || 'Registration failed');
        } finally {
            setAuthLoading(false);
            setRefreshFlag(!refreshFlag);
        }
    };

    // Handle logout
    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await AuthService.logout();
                        setAccountViewMode('collapsed');
                        setSuccessMessage("Successfully logged out");
                        setTimeout(() => setSuccessMessage(""), 3000);
                        setRefreshFlag(!refreshFlag);
                    }
                },
            ]
        );
    };

    // Handle password change
    const handleChangePassword = async () => {
        clearMessages();

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setAuthError("Please fill in all password fields");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setAuthError("New passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            setAuthError("New password must be at least 6 characters long");
            return;
        }

        setAuthLoading(true);
        try {
            // Implement password change logic here
            // await AuthService.changePassword(currentPassword, newPassword);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
            setShowChangePassword(false);
            setSuccessMessage("Password changed successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (e: any) {
            setAuthError(e?.message || 'Password change failed');
        } finally {
            setAuthLoading(false);
        }
    };

    // Handle account deletion
    const handleDeleteAccount = async () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Implement account deletion logic here
                            // await AuthService.deleteAccount();
                            await AuthService.logout();
                            setAccountViewMode('collapsed');
                            setSuccessMessage("Account deleted successfully");
                            setTimeout(() => setSuccessMessage(""), 3000);
                            setRefreshFlag(!refreshFlag);
                        } catch (e: any) {
                            setAuthError(e?.message || 'Account deletion failed');
                        }
                    }
                },
            ]
        );
    };

    // Handler for "clear all" button
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

    // Render account section based on view mode
    const renderAccountSection = () => {
        // Collapsed view - shows sign in button or user info
        if (accountViewMode === 'collapsed') {
            return (
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Account</Text>
                    {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
                    <TouchableOpacity
                        style={styles.expandButton}
                        onPress={() => setAccountViewMode('login')}
                    >
                        <Text style={styles.expandButtonText}>Sign In / Create Account</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        // Login view
        if (accountViewMode === 'login') {
            return (
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Sign In</Text>
                    {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
                    {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

                    <TextInput
                        placeholder="Email"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                        style={styles.input}
                        editable={!authLoading}
                    />
                    <TextInput
                        placeholder="Password"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        style={styles.input}
                        editable={!authLoading}
                    />

                    <View style={styles.authButtonsRow}>
                        <TouchableOpacity
                            style={[styles.actionButton]}
                            disabled={authLoading}
                            onPress={handleLogin}
                        >
                            {authLoading ? <ActivityIndicator color="#fff"/> :
                                <Text style={styles.actionButtonText}>Sign In</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.secondaryButton]}
                            disabled={authLoading}
                            onPress={() => {
                                clearMessages();
                                setAccountViewMode('register');
                            }}
                        >
                            <Text style={styles.actionButtonText}>Create Account</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                            clearMessages();
                            setEmail("");
                            setPassword("");
                            setAccountViewMode('collapsed');
                        }}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        // Register view
        if (accountViewMode === 'register') {
            return (
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Create Account</Text>
                    {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
                    {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

                    <TextInput
                        placeholder="Email"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                        style={styles.input}
                        editable={!authLoading}
                    />
                    <TextInput
                        placeholder="Password"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        style={styles.input}
                        editable={!authLoading}
                    />
                    <TextInput
                        placeholder="Confirm Password"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        style={styles.input}
                        editable={!authLoading}
                    />

                    <TouchableOpacity
                        style={[styles.actionButton]}
                        disabled={authLoading}
                        onPress={handleRegister}
                    >
                        {authLoading ? <ActivityIndicator color="#fff"/> :
                            <Text style={styles.actionButtonText}>Create Account</Text>}
                    </TouchableOpacity>

                    <View style={styles.switchViewRow}>
                        <Text style={styles.switchViewText}>Already have an account? </Text>
                        <TouchableOpacity
                            onPress={() => {
                                clearMessages();
                                setAccountViewMode('login');
                            }}
                            disabled={authLoading}
                        >
                            <Text style={styles.linkText}>Sign In</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                            clearMessages();
                            setEmail("");
                            setPassword("");
                            setConfirmPassword("");
                            setAccountViewMode('collapsed');
                        }}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        // Manage account view
        return (
            <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Account</Text>
                {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
                {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

                <View style={styles.accountInfoSection}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email:</Text>
                        <Text style={styles.infoValue}>{AuthService.current.user?.email || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Status:</Text>
                        <Text style={[styles.infoValue, styles.activeStatus]}>Active</Text>
                    </View>
                </View>

                {/* Change Password Section */}
                {!showChangePassword ? (
                    <TouchableOpacity
                        style={styles.settingActionButton}
                        onPress={() => {
                            clearMessages();
                            setShowChangePassword(true);
                        }}
                    >
                        <Text style={styles.settingActionButtonText}>Change Password</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.changePasswordSection}>
                        <TextInput
                            placeholder="Current Password"
                            secureTextEntry
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            style={styles.input}
                            editable={!authLoading}
                        />
                        <TextInput
                            placeholder="New Password"
                            secureTextEntry
                            value={newPassword}
                            onChangeText={setNewPassword}
                            style={styles.input}
                            editable={!authLoading}
                        />
                        <TextInput
                            placeholder="Confirm New Password"
                            secureTextEntry
                            value={confirmNewPassword}
                            onChangeText={setConfirmNewPassword}
                            style={styles.input}
                            editable={!authLoading}
                        />
                        <View style={styles.authButtonsRow}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.cancelActionButton]}
                                onPress={() => {
                                    setShowChangePassword(false);
                                    setCurrentPassword("");
                                    setNewPassword("");
                                    setConfirmNewPassword("");
                                    clearMessages();
                                }}
                                disabled={authLoading}
                            >
                                <Text style={styles.actionButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton]}
                                onPress={handleChangePassword}
                                disabled={authLoading}
                            >
                                {authLoading ? <ActivityIndicator color="#fff"/> :
                                    <Text style={styles.actionButtonText}>Update</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Account Actions */}
                <View style={styles.accountActionsRow}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.logoutButton]}
                        onPress={handleLogout}
                    >
                        <Text style={styles.actionButtonText}>Logout</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.dangerButton]}
                        onPress={handleDeleteAccount}
                    >
                        <Text style={styles.actionButtonText}>Delete Account</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <ScrollView style={styles.scrollContainer}>
            <View style={styles.container}>
                {/* Account Section */}
                {renderAccountSection()}

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
                            setRefreshFlag(!refreshFlag);
                        }}
                    />
                </View>

                {/* Meal Times */}
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Meal Times</Text>

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
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginLeft: 16,
        marginRight: 16,
        marginTop: 16,
        marginBottom: 32,
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
        fontWeight: '600',
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
    fontSizeButton: {
        padding: 10,
        alignItems: 'center',
        borderRadius: 6,
        backgroundColor: '#f0f0f0',
        marginTop: 8,
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
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 8,
        fontSize: 16,
    },
    actionButton: {
        backgroundColor: '#4B7BEC',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
        marginRight: 8,
        flex: 1,
    },
    secondaryButton: {
        backgroundColor: '#6C63FF',
    },
    dangerButton: {
        backgroundColor: '#FF6B6B',
    },
    logoutButton: {
        backgroundColor: '#FF9500',
    },
    cancelActionButton: {
        backgroundColor: '#999',
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    errorText: {
        color: '#FF3B30',
        marginBottom: 8,
        padding: 10,
        backgroundColor: '#FFE5E5',
        borderRadius: 6,
        fontSize: 14,
    },
    successText: {
        color: '#34C759',
        marginBottom: 8,
        padding: 10,
        backgroundColor: '#E5F8E8',
        borderRadius: 6,
        fontSize: 14,
    },
    authButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginTop: 8,
    },
    expandButton: {
        backgroundColor: '#4B7BEC',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 8,
    },
    expandButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    cancelButton: {
        marginTop: 12,
        alignItems: 'center',
        paddingVertical: 8,
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 14,
    },
    switchViewRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    switchViewText: {
        color: '#666',
        fontSize: 14,
    },
    linkText: {
        color: '#4B7BEC',
        fontSize: 14,
        fontWeight: '600',
    },
    accountInfoSection: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    infoLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        color: '#1a1a1a',
        fontWeight: '600',
    },
    activeStatus: {
        color: '#34C759',
    },
    settingActionButton: {
        backgroundColor: '#f0f0f0',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    settingActionButtonText: {
        color: '#333',
        fontWeight: '600',
    },
    changePasswordSection: {
        marginTop: 8,
    },
    accountActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
});