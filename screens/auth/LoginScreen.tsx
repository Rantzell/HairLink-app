import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface LoginScreenProps {
    onLogin: () => void;
    onSwitchToSignup: () => void;
    onForgotPassword?: () => void;
}

export default function LoginScreen({
    onLogin,
    onSwitchToSignup,
    onForgotPassword,
}: LoginScreenProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                {/* Background */}
                <LinearGradient
                    colors={["#EEF0FF", "#FFFFFF", "#FFFFFF"]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={{ flex: 1 }}
                >
                    <View className="flex-1 items-center px-6 pt-16">
                        {/* Logo ONLY (no circle / no container) */}
                        <Image
                            source={require("../../assets/Buildspherelogo4x.png")}
                            style={{ width: 56, height: 56 }}
                            resizeMode="contain"
                        />

                        {/* Title */}
                        <Text className="mt-5 text-[22px] font-bold text-[#1E1E1E]">
                            Log In to BuildSphere
                        </Text>

                        {/* Subtitle */}
                        <View className="flex-row items-center mt-2">
                            <Text className="text-[12.5px] text-[#A3A3A3]">
                                Don’t have an an account?{" "}
                            </Text>
                            <TouchableOpacity onPress={onSwitchToSignup} activeOpacity={0.8}>
                                <Text className="text-[12.5px] font-semibold text-[#6C63FF]">
                                    Sign Up
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Form */}
                        <View className="w-full mt-10">
                            {/* Email */}
                            <Text className="text-[12px] font-semibold text-[#2D2D2D] mb-2">
                                Email
                            </Text>
                            <View
                                className="bg-white rounded-[12px]"
                                style={{
                                    shadowColor: "#6C63FF",
                                    shadowOpacity: 0.18,
                                    shadowRadius: 10,
                                    shadowOffset: { width: 0, height: 6 },
                                    elevation: 3,
                                    borderWidth: 1,
                                    borderColor: "#E7E7EE",
                                }}
                            >
                                <TextInput
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="Enter your email"
                                    placeholderTextColor="#B9B9B9"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    className="px-4 h-[52px] text-[14px] text-[#1E1E1E]"
                                />
                            </View>

                            {/* Password */}
                            <Text className="text-[12px] font-semibold text-[#2D2D2D] mb-2 mt-6">
                                Password
                            </Text>
                            <View
                                className="bg-white rounded-[12px]"
                                style={{
                                    shadowColor: "#6C63FF",
                                    shadowOpacity: 0.18,
                                    shadowRadius: 10,
                                    shadowOffset: { width: 0, height: 6 },
                                    elevation: 3,
                                    borderWidth: 1,
                                    borderColor: "#E7E7EE",
                                }}
                            >
                                <TextInput
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Enter your password"
                                    placeholderTextColor="#B9B9B9"
                                    secureTextEntry
                                    className="px-4 h-[52px] text-[14px] text-[#1E1E1E]"
                                />
                            </View>

                            {/* Button */}
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={onLogin}
                                className="mt-10 rounded-[12px] h-[52px] justify-center items-center"
                                style={{
                                    backgroundColor: "#6C63FF",
                                    shadowColor: "#6C63FF",
                                    shadowOpacity: 0.25,
                                    shadowRadius: 12,
                                    shadowOffset: { width: 0, height: 8 },
                                    elevation: 4,
                                }}
                            >
                                <Text className="text-white font-semibold text-[15px]">
                                    Log In
                                </Text>
                            </TouchableOpacity>

                            {/* Forgot password */}
                            <TouchableOpacity
                                onPress={onForgotPassword}
                                activeOpacity={0.8}
                                className="self-center mt-6"
                            >
                                <Text className="text-[12px] text-[#B8B8B8]">
                                    Forgot Password?
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* bottom spacing like screenshot */}
                        <View style={{ height: 60 }} />
                    </View>
                </LinearGradient>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
