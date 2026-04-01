import { View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, Alert } from "react-native";
import { useState } from "react";

interface SignupScreenProps {
    onSignupComplete: () => void;
    onSwitchToLogin: () => void;
}

export default function SignupScreen({ onSignupComplete, onSwitchToLogin }: SignupScreenProps) {
    const [signUpStep, setSignUpStep] = useState(1);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleButtonPress = () => {
        if (signUpStep === 1) {
            setSignUpStep(2);
        } else {
            if (password !== confirmPassword) {
                Alert.alert("Error", "Passwords do not match!");
                return;
            }
            onSignupComplete();
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                <View className="flex-1 bg-[#F5F5F7] justify-center items-center px-4">
                    <View className="w-full max-w-[400px] bg-white rounded-[30px] p-8 shadow-sm items-center my-10">

                        <Image
                            source={require("../../assets/logo_BuildSphere.png")}
                            style={{ width: 80, height: 80 }}
                            resizeMode="contain"
                            className="mb-6"
                        />

                        <Text className="text-2xl font-bold text-[#1E1E1E] text-center mb-2">
                            Sign Up in BuildSphere
                        </Text>

                        <View className="flex-row mb-8 items-center justify-center">
                            <Text className="text-[#9A9A9A] text-sm">
                                Already have an account?
                            </Text>
                            <TouchableOpacity onPress={onSwitchToLogin}>
                                <Text className="text-[#6C63FF] text-sm font-bold">
                                    Log In
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View className="w-full space-y-4">
                            {signUpStep === 1 && (
                                <>
                                    <View className="flex-row gap-3">
                                        <View className="flex-1">
                                            <Text className="text-xs font-bold text-[#3A3A3A] mb-2 ml-1">First Name</Text>
                                            <TextInput placeholder="First name" className="w-full bg-white border border-[#E6E6E6] rounded-xl px-4 h-12 text-sm" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-xs font-bold text-[#3A3A3A] mb-2 ml-1">Last Name</Text>
                                            <TextInput placeholder="Last name" className="w-full bg-white border border-[#E6E6E6] rounded-xl px-4 h-12 text-sm" />
                                        </View>
                                    </View>
                                    <View className="mt-4">
                                        <Text className="text-xs font-bold text-[#3A3A3A] mb-2 ml-1">Email</Text>
                                        <TextInput placeholder="Enter your email" keyboardType="email-address" className="w-full bg-white border border-[#E6E6E6] rounded-xl px-4 h-12 text-sm" />
                                    </View>
                                </>
                            )}

                            {signUpStep === 2 && (
                                <>
                                    <View>
                                        <Text className="text-xs font-bold text-[#3A3A3A] mb-2 ml-1">Company Role</Text>
                                        <View className="w-full bg-white border border-[#E6E6E6] rounded-xl px-4 h-12 justify-center">
                                            <Text className="text-gray-400 text-sm">Select ▼</Text>
                                        </View>
                                    </View>
                                    <View className="mt-4">
                                        <Text className="text-xs font-bold text-[#3A3A3A] mb-2 ml-1">Password</Text>
                                        <TextInput placeholder="Enter your password" secureTextEntry value={password} onChangeText={setPassword} className="w-full bg-white border border-[#E6E6E6] rounded-xl px-4 h-12 text-sm" />
                                    </View>
                                    <View className="mt-4">
                                        <Text className="text-xs font-bold text-[#3A3A3A] mb-2 ml-1">Confirm Password</Text>
                                        <TextInput placeholder="Confirm your password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} className="w-full bg-white border border-[#E6E6E6] rounded-xl px-4 h-12 text-sm" />
                                    </View>
                                </>
                            )}

                            <TouchableOpacity
                                className="w-full bg-[#6C63FF] rounded-xl h-[52px] justify-center items-center mt-6 shadow-md shadow-indigo-200"
                                onPress={handleButtonPress}
                            >
                                <Text className="text-white font-bold text-base">
                                    {signUpStep === 1 ? "Next" : "Sign Up"}
                                </Text>
                            </TouchableOpacity>

                            {signUpStep === 2 && (
                                <TouchableOpacity className="items-center mt-4" onPress={() => setSignUpStep(1)}>
                                    <Text className="text-[#B0B0B0] text-xs">Back to Step 1</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
