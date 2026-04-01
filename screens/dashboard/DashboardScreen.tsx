import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import ProjectCard from './ProjectCard';

interface DashboardScreenProps {
    onLogout: () => void;
}

export default function DashboardScreen({ onLogout }: DashboardScreenProps) {
    return (
        <View className="flex-1 bg-[#F5F5F7]">
            {/* SafeAreaView keeps content away from the notch/status bar */}
            <SafeAreaView className="flex-1">
                <ScrollView contentContainerStyle={{ paddingBottom: 100 }} className="px-5 pt-4">

                    {/* Header Title */}
                    <Text className="text-[#6C63FF] text-[22px] font-bold mb-4">Home</Text>

                    {/* ONGOING PROJECTS CARD */}
                    <View className="bg-white rounded-[20px] p-5 shadow-sm mb-6 flex-row justify-between items-center border border-gray-100">
                        <Text className="text-[#1E1E1E] text-base font-semibold">Ongoing Projects</Text>
                        <Text className="text-[#FFA500] text-3xl font-bold">5</Text>
                    </View>

                    {/* PROJECTS SECTION */}
                    <Text className="text-[#1E1E1E] text-lg font-bold mb-4">Projects</Text>

                    {/* Project Card 1 */}
                    <ProjectCard name="Project Name" location="Glassworks" color="bg-[#FFD6F3]" />

                    {/* Project Card 2 */}
                    <ProjectCard name="City Tower A" location="Downtown" color="bg-[#E5D4FF]" />

                    {/* Project Card 3 */}
                    <ProjectCard name="River Side Base" location="Industrial" color="bg-[#D4E5FF]" />

                </ScrollView>

                {/* BOTTOM NAVIGATION (Floating Pill) */}
                <View className="absolute bottom-8 left-5 right-5 bg-white rounded-[30px] h-[70px] flex-row items-center justify-between px-6 shadow-xl shadow-gray-200">

                    {/* Home (Active) */}
                    <View className="bg-[#EAE8FF] p-2 rounded-full px-4 items-center">
                        <Ionicons name="home" size={24} color="#6C63FF" />
                        <Text className="text-[10px] text-[#6C63FF] font-bold mt-1">Home</Text>
                    </View>

                    {/* My Work */}
                    <TouchableOpacity className="items-center opacity-40">
                        <Ionicons name="briefcase-outline" size={24} color="black" />
                        <Text className="text-[10px] text-black mt-1">My Work</Text>
                    </TouchableOpacity>

                    {/* Notifications */}
                    <TouchableOpacity className="items-center opacity-40">
                        <Ionicons name="notifications-outline" size={24} color="black" />
                        <Text className="text-[10px] text-black mt-1">Notifs</Text>
                    </TouchableOpacity>

                    {/* More (Log out trigger for demo) */}
                    <TouchableOpacity className="items-center opacity-40" onPress={onLogout}>
                        <Ionicons name="ellipsis-horizontal" size={24} color="black" />
                        <Text className="text-[10px] text-black mt-1">More</Text>
                    </TouchableOpacity>

                </View>
            </SafeAreaView>
        </View>
    );
}
