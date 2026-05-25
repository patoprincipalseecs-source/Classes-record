import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState, useMemo, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Platform, Alert,
} from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
// Web: ScreenOrientation disabled
import { printOrShareHtml } from "@/utils/printHtml";

import { useColors } from "@/hooks/useColors";
import { fetchMeeting, fetchSchedule, fetchOptions, MeetingResult, ScheduleOptions } from "@/hooks/useApi";
import { PickerModal } from "@/components/PickerModal";

function buildHourLabels(startH: number, endH: number): string[] {
  return Array.from({ length: endH - startH }, (_, i) => {
    const h = i + startH;
    if (h < 12) return `${h.toString().padStart(2, "0")}:00 AM`;
    if (h === 12) return "12:00 PM";
    return `${(h - 12).toString().padStart(2, "0")}:00 PM`;
  });
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatHM(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = (h % 12) || 12;
  return `${h12.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")} ${ap}`;
}

export default function MeetingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { startHour: shP, endHour: ehP, activeDays: adP, scheduleId: scheduleIdParam } = useLocalSearchParams<{ startHour?: string; endHour?: string; activeDays?: string; scheduleId?: string }>();
  const scheduleId = scheduleIdParam ? parseInt(String(scheduleIdParam)) : undefined;
  const meetStartHour = shP ? Number(shP) : 9;
  const meetEndHour   = ehP ? Number(ehP) : 17;
  const HOUR_LABELS = buildHourLabels(meetStartHour, meetEndHour);
  const DAYS = adP ? decodeURIComponent(adP).split(",").filter(d => ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].includes(d)) : ["Mon","Tue","Wed","Thu","Fri"];

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "web") {
        // ScreenOrientation.lockAsync(// ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
      }
      return () => {
        if (Platform.OS !== "web") {
          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
        }
      };
    }, [])
  );

  const [date, setDate] = useState(todayStr);
  const [start, setStart] = useState("09:00 AM");
  const [end, setEnd] = useState("10:00 AM");
  const [selectedFaculty, setSelectedFaculty] = useState<string[]>([]);
  const [showFacPicker, setShowFacPicker] = useState(false);
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [activeTab, setActiveTab] = useState<"free" | "busy">("free");

  const { data: schedule = [] } = useQuery({ queryKey: ["schedule", scheduleId], queryFn: () => fetchSchedule(scheduleId) });
  const { data: options } = useQuery<ScheduleOptions>({ queryKey: ["options", scheduleId], queryFn: () => fetchOptions(scheduleId) });

  const facultyList = useMemo(() => {
    const fromDB = [...new Set(schedule.filter((r) => !r.Type).map((r) => r.Faculty))].filter(Boolean).sort();
    if (fromDB.length > 0) return fromDB;
    const fromOpts = options?.faculty ?? [];
    return [...new Set([...fromDB, ...fromOpts])].sort();
  }, [schedule, options]);

  const availableFaculty = useMemo(
    () => facultyList.filter((f) => !selectedFaculty.includes(f)),
    [facultyList, selectedFaculty]
  );

  const mutation = useMutation({
    mutationFn: () => fetchMeeting(date, start, end, selectedFaculty.length > 0 ? selectedFaculty : undefined, scheduleId),
    onSuccess: (data) => setResult(data),
    onError: () => Alert.alert("Error", "Could not generate report"),
  });

  async function handleDownload() {
    if (!result) { Alert.alert("No Report", "Generate a report first before downloading."); return; }

    const facNote = selectedFaculty.length > 0 ? selectedFaculty.join(", ") : "All Faculty";
    // Department breakdown with Grand Total
    const deptEntries = Object.entries(result.summary).sort();
    const grandFree = deptEntries.reduce((s, [, c]) => s + (c as any).free, 0);
    const grandBusy = deptEntries.reduce((s, [, c]) => s + (c as any).busy, 0);
    const grandTotal = grandFree + grandBusy;
    const deptBreakdown = deptEntries.map(([dept, counts]: any) =>
      `<tr><td>${dept}</td><td style="text-align:center;color:#2E7D32;font-weight:bold">${counts.free}</td><td style="text-align:center;color:#C62828;font-weight:bold">${counts.busy}</td><td style="text-align:center;font-weight:bold">${counts.free + counts.busy}</td></tr>`
    ).join("") + `<tr style="background:#E3F2FD;font-weight:bold"><td>Grand Total</td><td style="text-align:center;color:#2E7D32">${grandFree}</td><td style="text-align:center;color:#C62828">${grandBusy}</td><td style="text-align:center">${grandTotal}</td></tr>`;
    // FREE faculty grouped by dept
    const freeDepts = [...new Set(result.free.map((f: any) => f.dept))].sort() as string[];
    const freeByDept = freeDepts.map(dept => {
      const members = result.free.filter((f: any) => f.dept === dept);
      return `<tr style="background:#F1F8E9"><td colspan="2" style="font-weight:bold;color:#2E7D32;font-size:11px">${dept} (${members.length})</td></tr>` +
        members.map((f: any) => `<tr><td>${f.name}</td><td style="color:#555">${f.dept}</td></tr>`).join("");
    }).join("");
    // BUSY faculty grouped by dept with schedule details
    const busyDepts = [...new Set(result.busy.map((b: any) => b.dept))].sort() as string[];
    const busyByDept = busyDepts.map(dept => {
      const members = result.busy.filter((b: any) => b.dept === dept);
      const rows = members.map((b: any) => {
        const records = b.records.map((r: any) =>
          `<tr style="background:#FFF8F8"><td style="padding-left:20px;color:#C62828">${r.subject}</td><td>${r.cls}</td><td>${r.loc}</td><td style="white-space:nowrap">${formatHM(r.start)} – ${formatHM(r.end)}</td><td>${r.type}</td></tr>`
        ).join("");
        return `<tr style="background:#FFEBEE"><td colspan="5" style="font-weight:bold;color:#C62828">● ${b.name} — ${b.dept}</td></tr>${records}`;
      }).join("");
      return `<tr style="background:#FFCDD2"><td colspan="5" style="font-weight:bold;color:#B71C1C;font-size:11px">${dept} (${members.length})</td></tr>${rows}`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; background: #fff; }
  .hdr { background: #1565C0; color: #fff; padding: 14px 18px; }
  .hdr h1 { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
  .hdr p { font-size: 11px; opacity: .9; margin-top: 3px; }
  .meta { display: flex; border-bottom: 2px solid #1565C0; }
  .meta-box { flex: 1; padding: 10px 14px; border-right: 1px solid #E0E0E0; }
  .meta-box:last-child { border-right: none; }
  .meta-label { font-size: 9px; color: #888; text-transform: uppercase; }
  .meta-value { font-size: 13px; font-weight: bold; color: #1565C0; margin-top: 2px; }
  .section-title { padding: 7px 14px; font-weight: bold; font-size: 12px; border-left: 4px solid #1565C0; margin: 10px 0 0 0; background: #F5F5F5; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #E0E0E0; padding: 5px 8px; font-size: 10px; vertical-align: top; }
  th { background: #1565C0; color: #fff; padding: 6px 8px; font-size: 10px; text-align: left; }
  tr { page-break-inside: avoid; }
</style></head><body>
<div class="hdr">
  <h1>Meeting Availability Report</h1>
  <p>Date: ${result.date} &nbsp;&nbsp; Day: ${result.dayName}</p>
  <p>Time: ${result.start} – ${result.end}</p>
</div>
<div class="meta">
  <div class="meta-box"><div class="meta-label">Free Faculty</div><div class="meta-value" style="color:#2E7D32">${result.free.length}</div></div>
  <div class="meta-box"><div class="meta-label">Busy Faculty</div><div class="meta-value" style="color:#C62828">${result.busy.length}</div></div>
  <div class="meta-box"><div class="meta-label">Total Checked</div><div class="meta-value">${result.free.length + result.busy.length}</div></div>
  <div class="meta-box"><div class="meta-label">Generated</div><div class="meta-value" style="font-size:10px">${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</div></div>
</div>
${deptEntries.length > 0 ? `
<div class="section-title">Department Summary</div>
<table><thead><tr><th>Department</th><th style="text-align:center">Free</th><th style="text-align:center">Busy</th><th style="text-align:center">Total</th></tr></thead>
<tbody>${deptBreakdown}</tbody></table>` : ""}
<div class="section-title" style="border-left-color:#2E7D32;color:#2E7D32">FREE Faculty (${result.free.length})</div>
<table><thead><tr><th>Name</th><th>Department</th></tr></thead>
<tbody>${freeByDept || "<tr><td colspan='2' style='color:#999'>None</td></tr>"}</tbody></table>
<div class="section-title" style="border-left-color:#C62828;color:#C62828;margin-top:12px">BUSY Faculty (${result.busy.length})</div>
<table><thead><tr><th>Name</th><th>Subject</th><th>Location</th><th>Time</th><th>Type</th></tr></thead>
<tbody>${busyByDept || "<tr><td colspan='5' style='color:#999'>None</td></tr>"}</tbody></table>
</body></html>`;

    try {
      await printOrShareHtml(html, "Save Meeting Report PDF");
    } catch {
      Alert.alert("Error", "Could not generate PDF. Please try again.");
    }
  }

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.primary,
      paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
      paddingBottom: 14, paddingHorizontal: 16,
    },
    homeBtn: {
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20,
      paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start", marginBottom: 10,
    },
    homeBtnTxt: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },
    headerTitle: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold" },
    headerSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
    scroll: { padding: 16 },
    label: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 6, marginTop: 14, textTransform: "uppercase", letterSpacing: 0.5 },
    input: {
      backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
      fontFamily: "Inter_400Regular", fontSize: 14, color: colors.foreground,
      borderWidth: 1, borderColor: colors.border,
    },
    optRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    optBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    optBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    optTxt: { fontFamily: "Inter_500Medium", fontSize: 13, color: colors.foreground },
    optTxtActive: { color: "#fff" },
    facAddBtn: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: colors.card, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 12,
      borderWidth: 1, borderColor: colors.border, borderStyle: "dashed",
    },
    facAddTxt: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: colors.mutedForeground },
    chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
    chip: {
      flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryLight || "#EEF4FF",
      borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
      borderWidth: 1, borderColor: colors.primary,
    },
    chipTxt: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.primary },
    allFacChip: {
      flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.muted,
      borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
      borderWidth: 1, borderColor: colors.border,
    },
    allFacTxt: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, fontStyle: "italic" },
    generateBtn: {
      backgroundColor: colors.primary, borderRadius: 12, padding: 14,
      alignItems: "center", marginTop: 20,
    },
    generateBtnTxt: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
    resultHeader: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 8 },
    tabRow: { flexDirection: "row", marginBottom: 12 },
    tabBtn: { flex: 1, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: colors.border, alignItems: "center" },
    tabBtnActive: { borderBottomColor: colors.primary },
    tabTxt: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.mutedForeground },
    tabTxtActive: { color: colors.primary },
    summaryCard: { flexDirection: "row", gap: 12, marginBottom: 16 },
    summaryBox: {
      flex: 1, padding: 14, borderRadius: 12, borderWidth: 1,
      borderColor: colors.border, alignItems: "center",
    },
    summaryNum: { fontSize: 28, fontFamily: "Inter_700Bold" },
    summaryLbl: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
    personCard: {
      backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 8,
      borderWidth: 1, borderColor: colors.border,
    },
    personName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    personDept: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
    busyRecord: { marginTop: 8, backgroundColor: colors.muted, borderRadius: 12, padding: 10 },
    busyTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.foreground },
    emptyTxt: { color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", marginTop: 20 },
    deptSummaryCard: {
      backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 16,
      borderWidth: 1, borderColor: colors.border,
    },
    deptTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 8 },
    deptRow2: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: colors.border },
    deptRowLast: { borderBottomWidth: 0 },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={s.homeBtn} onPress={() => router.back()}>
              <Feather name="chevron-left" size={13} color="#fff" />
              <Text style={s.homeBtnTxt}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.homeBtn} onPress={() => router.replace("/" as never)}>
              <Feather name="home" size={13} color="#fff" />
              <Text style={s.homeBtnTxt}>Home</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[s.homeBtn, !result && { opacity: 0.5 }]}
            onPress={handleDownload}
          >
            <Feather name="download" size={13} color="#fff" />
            <Text style={s.homeBtnTxt}>Download</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.headerTitle}>Meeting Availability</Text>
        <Text style={s.headerSub}>Check who is free for a meeting</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Date</Text>
        <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} />

        <Text style={s.label}>Start Time</Text>
        <View style={s.optRow}>
          {HOUR_LABELS.slice(0, 8).map((t) => (
            <TouchableOpacity key={t} style={[s.optBtn, start === t && s.optBtnActive]} onPress={() => setStart(t)}>
              <Text style={[s.optTxt, start === t && s.optTxtActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>End Time</Text>
        <View style={s.optRow}>
          {HOUR_LABELS.slice(1).map((t) => (
            <TouchableOpacity key={t} style={[s.optBtn, end === t && s.optBtnActive]} onPress={() => setEnd(t)}>
              <Text style={[s.optTxt, end === t && s.optTxtActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>
          Faculty Filter{selectedFaculty.length > 0 ? ` · ${selectedFaculty.length} selected` : " (optional — leave empty for ALL)"}
        </Text>

        {selectedFaculty.length === 0 ? (
          <View style={s.allFacChip}>
            <Feather name="users" size={14} color={colors.mutedForeground} />
            <Text style={s.allFacTxt}>All faculty — no filter applied</Text>
          </View>
        ) : (
          <View style={s.chipsRow}>
            {selectedFaculty.map((f) => (
              <TouchableOpacity key={f} style={s.chip} onPress={() => setSelectedFaculty((prev) => prev.filter((x) => x !== f))}>
                <Text style={s.chipTxt} numberOfLines={1}>{f}</Text>
                <Feather name="x" size={13} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={[s.facAddBtn, { marginTop: 8 }]} onPress={() => setShowFacPicker(true)}>
          <Feather name="user-plus" size={16} color={colors.primary} />
          <Text style={s.facAddTxt}>
            {availableFaculty.length > 0 ? "Add faculty to filter…" : "All faculty selected"}
          </Text>
          <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>

        {selectedFaculty.length > 0 && (
          <TouchableOpacity
            onPress={() => setSelectedFaculty([])}
            style={{ marginTop: 6, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Feather name="x-circle" size={13} color={colors.mutedForeground} />
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>Clear all</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[s.generateBtn, mutation.isPending && { opacity: 0.6 }]}
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.generateBtnTxt}>Generate Report</Text>}
        </TouchableOpacity>

        {result && (
          <View>
            <View style={s.divider} />
            <Text style={s.resultHeader}>
              {result.dayName}, {result.date} · {result.start} – {result.end}
            </Text>

            <View style={s.summaryCard}>
              <View style={[s.summaryBox, { borderColor: "#4CAF50", backgroundColor: colors.successBg }]}>
                <Text style={[s.summaryNum, { color: "#388E3C" }]}>{result.free.length}</Text>
                <Text style={s.summaryLbl}>Free</Text>
              </View>
              <View style={[s.summaryBox, { borderColor: "#F44336", backgroundColor: colors.errorBg }]}>
                <Text style={[s.summaryNum, { color: "#D32F2F" }]}>{result.busy.length}</Text>
                <Text style={s.summaryLbl}>Busy</Text>
              </View>
            </View>

            {Object.keys(result.summary).length > 0 && (
              <View style={s.deptSummaryCard}>
                <Text style={s.deptTitle}>Department Breakdown</Text>
                {Object.entries(result.summary).sort().map(([dept, counts], i, arr) => (
                  <View key={dept} style={[s.deptRow2, i === arr.length - 1 && s.deptRowLast]}>
                    <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.foreground }}>{dept}</Text>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground }}>
                      Free: <Text style={{ color: "#388E3C", fontFamily: "Inter_700Bold" }}>{counts.free}</Text>{"  "}
                      Busy: <Text style={{ color: "#D32F2F", fontFamily: "Inter_700Bold" }}>{counts.busy}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={s.tabRow}>
              <TouchableOpacity style={[s.tabBtn, activeTab === "free" && s.tabBtnActive]} onPress={() => setActiveTab("free")}>
                <Text style={[s.tabTxt, activeTab === "free" && s.tabTxtActive]}>Free ({result.free.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.tabBtn, activeTab === "busy" && s.tabBtnActive]} onPress={() => setActiveTab("busy")}>
                <Text style={[s.tabTxt, activeTab === "busy" && s.tabTxtActive]}>Busy ({result.busy.length})</Text>
              </TouchableOpacity>
            </View>

            {activeTab === "free" ? (
              result.free.length === 0
                ? <Text style={s.emptyTxt}>No free faculty</Text>
                : result.free.map((f) => (
                  <View key={f.name} style={[s.personCard, { borderLeftWidth: 3, borderLeftColor: "#4CAF50" }]}>
                    <Text style={s.personName}>{f.name}</Text>
                    <Text style={s.personDept}>{f.dept}</Text>
                  </View>
                ))
            ) : (
              result.busy.length === 0
                ? <Text style={s.emptyTxt}>No busy faculty</Text>
                : result.busy.map((b) => (
                  <View key={b.name} style={[s.personCard, { borderLeftWidth: 3, borderLeftColor: "#F44336" }]}>
                    <Text style={s.personName}>{b.name}</Text>
                    <Text style={s.personDept}>{b.dept}</Text>
                    {b.records.map((r, i) => (
                      <View key={i} style={s.busyRecord}>
                        <Text style={s.busyTxt}>{r.subject} · {r.cls}</Text>
                        <Text style={[s.busyTxt, { color: colors.mutedForeground }]}>
                          {formatHM(r.start)} – {formatHM(r.end)} · {r.loc} · {r.type}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))
            )}
          </View>
        )}
      </ScrollView>

      <PickerModal
        visible={showFacPicker}
        title="Add Faculty"
        items={availableFaculty}
        selected=""
        onSelect={(v) => {
          setSelectedFaculty((prev) => [...prev, v]);
          setShowFacPicker(true);
        }}
        onClose={() => setShowFacPicker(false)}
        placeholder="Search faculty..."
      />
    </View>
  );
}
