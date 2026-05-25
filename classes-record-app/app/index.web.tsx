import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://process.env.EXPO_PUBLIC_DOMAIN || "classes-record.onrender.com"';

const TILES = [
  { route: "/(screens)/my-schedules", emoji: "🔒", title: "My Schedules", subtitle: "Schedule · Attendance · Summary", color: "#AD1457", bg: "#FCE4EC" },
  { route: "/(screens)/faculty-portal", emoji: "👤", title: "Faculty Sign In", subtitle: "Attendance · Exam marks", color: "#00695C", bg: "#E0F2F1" },
  { route: "/(screens)/student-portal", emoji: "🎓", title: "Student Sign In", subtitle: "Attendance · Marks · Profile", color: "#1565C0", bg: "#E3F2FD" },
  { route: "/(screens)/finance", emoji: "💰", title: "Account & Finance", subtitle: "Fees · Salary · Payments", color: "#F57F17", bg: "#FFFDE7" },
  { route: "/(screens)/admin-panel", emoji: "🛡️", title: "Admin Panel", subtitle: "Users · Passwords · CSV", color: "#4A148C", bg: "#EDE7F6" },
  { route: "/(screens)/tutorial", emoji: "📖", title: "Tutorial", subtitle: "Guide · Examples · PDF", color: "#283593", bg: "#E8EAF6" },
  { route: "/(screens)/contact", emoji: "📞", title: "Contact Us", subtitle: "Alamdar Hussain · Islamabad", color: "#1565C0", bg: "#E3F2FD" },
];

const fetchPublicSchedules = async () => {
  try {
    const response = await fetch(`${API_URL}/api/schedules/public`);
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch (error) {
    return [
      { id: "1", name: "Spring 2026 Schedule", userId: "Admin", startDate: "2026-01-15", endDate: "2026-05-30" },
      { id: "2", name: "Faculty Training Program", userId: "Dean Office", startDate: "2026-02-01", endDate: "2026-02-28" }
    ];
  }
};

export default function WebDashboard() {
  const colors = { background: '#f5f5f5', primary: '#1976D2', card: '#fff', border: '#e0e0e0', foreground: '#333', mutedForeground: '#666', muted: '#f0f0f0' };
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: publicSchedules = [], isLoading } = useQuery({
    queryKey: ["publicSchedules"],
    queryFn: fetchPublicSchedules,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.primary, paddingTop: insets.top + 20, paddingBottom: 24, paddingHorizontal: 20 }}>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>Classes Record</Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 4 }}>Faculty Management System</Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {TILES.map((tile) => (
            <TouchableOpacity
              key={tile.route}
              style={{ width: '47%', borderRadius: 20, padding: 16, backgroundColor: tile.bg, borderWidth: 0.5, borderColor: '#e0e0e0', alignItems: 'flex-start' }}
              onPress={() => router.push(tile.route as never)}
            >
              <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 10, backgroundColor: tile.bg }}>
                <Text style={{ fontSize: 26 }}>{tile.emoji}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 3 }}>{tile.title}</Text>
              <Text style={{ fontSize: 12, color: '#666' }}>{tile.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 18 }}>🌐</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>Public Schedules</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#1976D2" style={{ marginBottom: 16 }} />
        ) : publicSchedules.length === 0 ? (
          <View style={{ marginHorizontal: 16, marginBottom: 12, padding: 14, backgroundColor: '#f0f0f0', borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#666' }}>No public schedules yet</Text>
          </View>
        ) : (
          publicSchedules.map((sch) => (
            <TouchableOpacity
              key={sch.id}
              style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#1976D2', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
              onPress={() => router.push(`/(screens)/schedule-dashboard?scheduleId=${sch.id}&scheduleTitle=${encodeURIComponent(sch.name)}` as never)}
            >
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }}>🌐</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#333' }}>{sch.name}</Text>
                <Text style={{ fontSize: 12, color: '#666' }}>by {sch.userId}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}
