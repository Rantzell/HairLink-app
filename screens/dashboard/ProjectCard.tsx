import { View, Text } from "react-native";
import { Ionicons } from '@expo/vector-icons';

interface ProjectCardProps {
    name: string;
    location: string;
    color: string;
}

export default function ProjectCard({ name, location, color }: ProjectCardProps) {
    return (
        <View className="bg-white rounded-[24px] mb-4 overflow-hidden shadow-sm border border-gray-100">
            {/* Top Color Area */}
            <View className={`h-[120px] ${color} w-full flex-row justify-end p-4`}>
                <Ionicons name="ellipsis-vertical" size={20} color="black" style={{ opacity: 0.3 }} />
            </View>

            {/* Bottom Info Area */}
            <View className="p-4 flex-row items-center gap-3">
                {/* Icon Circle */}
                <View className="w-10 h-10 bg-pink-50 rounded-full items-center justify-center">
                    <Ionicons name="business" size={20} color="#FF88D1" />
                </View>
                <View>
                    <Text className="text-[#1E1E1E] font-bold text-sm">{name}</Text>
                    <Text className="text-[#9A9A9A] text-xs">{location}</Text>
                </View>
            </View>
        </View>
    );
}
