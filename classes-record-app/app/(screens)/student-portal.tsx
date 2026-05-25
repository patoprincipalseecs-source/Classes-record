import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, Platform, Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { studentPortalLogin } from "@/hooks/useApi";

const SESSION_KEY = "STUDENT_PORTAL_SESSION";
const PHOTO_KEY = "STUDENT_PORTAL_PHOTO_";
const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN || "classes-record.onrender.com"}/api`;

interface StudentSession {
  studentName: string;
  rollNo: string;
  className: string;
  scheduleId: number;
  scheduleName: string;
  username: string;
}

function shortDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso + (iso.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function StudentPortalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ scheduleId?: string; scheduleTitle?: string }>();

  useFocusEffect(useCallback(() => {
    if (Platform.OS !== "web")
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []));

  const [session, setSession] = useState<StudentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"attendance"|"fee"|"marks">("attendance");
  const [showChangePass, setShowChangePass] = useState(false);
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Load session
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
      if (saved) setSession(JSON.parse(saved));
    } catch {}
    setLoading(false);
  }, []);

  // Load photo
  useEffect(() => {
    if (session?.username && typeof window !== "undefined") {
      const p = localStorage.getItem(PHOTO_KEY + session.username);
      if (p) setPhotoUri(p);
    }
  }, [session?.username]);

  async function handleLogin() {
    if (!username.trim() || !password.trim()) { setErrorMsg("Enter username and password"); return; }
    setLoginLoading(true); setErrorMsg("");
    const res = await studentPortalLogin(username.trim(), password.trim());
    setLoginLoading(false);
    if (res.success) {
      const s: StudentSession = { studentName: res.studentName, rollNo: res.rollNo, className: res.className, scheduleId: res.scheduleId, scheduleName: res.scheduleName, username: username.trim() };
      setSession(s);
      if (typeof window !== "undefined") localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    } else { setErrorMsg(res.message || "Login failed"); }
  }

  function handleSignOut() {
    setSession(null);
    if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
  }

  async function handleChangePassword() {
    if (!curPass || !newPass || !confirmPass) { setErrorMsg("Fill all fields"); return; }
    if (newPass !== confirmPass) { setErrorMsg("Passwords do not match"); return; }
    if (newPass.length < 4) { setErrorMsg("Password must be at least 4 characters"); return; }
    const res = await fetch(`${API_BASE}/student-portal/change-password`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: session?.username, currentPassword: curPass, newPassword: newPass })
    }).then(r => r.json());
    if (res.success) {
      setShowChangePass(false);
      if (typeof window !== "undefined") window.alert("✅ Password changed successfully!");
    } else { setErrorMsg(res.message || "Failed to change password"); }
  }

  function handlePhotoChange() {
    if (typeof window === "undefined" || !session) return;
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 1024 * 1024) { window.alert("Photo must be less than 1 MB"); return; }
      const reader = new FileReader();
      reader.onload = (ev: any) => {
        // Compress to max 300x300
        const img = document.createElement("img");
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 300;
          let w = img.width, h = img.height;
          if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
          if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL("image/jpeg", 0.7);
          setPhotoUri(compressed);
          localStorage.setItem(PHOTO_KEY + session.username, compressed);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { backgroundColor: colors.primary, paddingTop: insets.top + (Platform.OS === "web" ? 0 : 0), paddingBottom: 16, paddingHorizontal: 16 },
    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    homeBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    homeBtnTxt: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
    signOutBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    signOutTxt: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
    profileRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10 },
    photoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.5)", overflow: "hidden" },
    photoImg: { width: 64, height: 64, borderRadius: 32 },
    cameraBtn: { position: "absolute", bottom: 0, right: 0, backgroundColor: colors.primary, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: "#fff" },
    headerTitle: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 20 },
    headerSub: { color: "rgba(255,255,255,0.85)", fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
    badge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginTop: 6 },
    badgeTxt: { color: "#fff", fontSize: 11, fontFamily: "Inter_400Regular" },
    tabs: { flexDirection: "row", backgroundColor: colors.card, marginHorizontal: 16, marginTop: 14, borderRadius: 12, padding: 4, gap: 4 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
    tabActive: { backgroundColor: colors.primary },
    tabTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    tabTxtActive: { color: "#fff" },
    card: { backgroundColor: colors.card, borderRadius: 14, marginHorizontal: 16, marginTop: 12, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    cardTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: colors.foreground, marginBottom: 10 },
    row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    rowLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground },
    rowValue: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.foreground },
    changePassBtn: { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, padding: 14, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    changePassTxt: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.mutedForeground },
    loginCard: { margin: 24, backgroundColor: colors.card, borderRadius: 20, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
    loginTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: colors.foreground, marginBottom: 4 },
    loginSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, marginBottom: 24 },
    inputRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.muted, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: colors.foreground },
    loginBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
    loginBtnTxt: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
    errTxt: { color: colors.destructive, fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 10, textAlign: "center" },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
    modalBox: { backgroundColor: colors.card, borderRadius: 16, width: "100%", padding: 20, gap: 12 },
    modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center" },
    modalBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
    modalBtnTxt: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
    chip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginRight: 6 },
  });

  if (loading) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator size="large" color={colors.primary} /></View>;

  // ── LOGIN SCREEN ──
  if (!session) {
    return (
      <View style={s.container}>
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={s.homeBtn} onPress={() => router.replace("/" as never)}>
            <Feather name="home" size={13} color="#fff" />
            <Text style={s.homeBtnTxt}>Home</Text>
          </TouchableOpacity>
          <Text style={[s.headerTitle, { marginTop: 12 }]}>Student Sign In</Text>
          <Text style={s.headerSub}>View attendance, fee status & exam marks</Text>
        </View>
        <View style={s.loginCard}>
          <Text style={s.loginTitle}>Welcome, Student</Text>
          <Text style={s.loginSub}>Sign in with your credentials provided by your institution</Text>
          {errorMsg ? <Text style={s.errTxt}>{errorMsg}</Text> : null}
          <View style={s.inputRow}>
            <Feather name="user" size={18} color={colors.mutedForeground} />
            <TextInput style={s.input} value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor={colors.mutedForeground} autoCapitalize="none" />
          </View>
          <View style={s.inputRow}>
            <Feather name="lock" size={18} color={colors.mutedForeground} />
            <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.mutedForeground} secureTextEntry={!showPass} />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Feather name={showPass ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[s.loginBtn, { opacity: loginLoading ? 0.7 : 1 }]} onPress={handleLogin} disabled={loginLoading}>
            {loginLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.loginBtnTxt}>Sign In</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── DASHBOARD ──
  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.topRow}>
          <TouchableOpacity style={s.homeBtn} onPress={() => router.replace("/" as never)}>
            <Feather name="home" size={13} color="#fff" />
            <Text style={s.homeBtnTxt}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
            <Feather name="log-out" size={13} color="#fff" />
            <Text style={s.signOutTxt}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        <View style={s.profileRow}>
          <TouchableOpacity onPress={handlePhotoChange} style={{ position: "relative" }}>
            <View style={s.photoCircle}>
              {photoUri ? <Image source={{ uri: photoUri }} style={s.photoImg} /> : <Feather name="user" size={28} color="rgba(255,255,255,0.8)" />}
            </View>
            <View style={s.cameraBtn}><Feather name="camera" size={10} color="#fff" /></View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{session.studentName}</Text>
            <Text style={s.headerSub}>{session.className} · {session.rollNo}</Text>
            <Text style={s.headerSub}>{session.scheduleName}</Text>
            <View style={s.badge}>
              <Feather name="user" size={11} color="#fff" />
              <Text style={s.badgeTxt}>{session.username}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {([["attendance","check-square","Attendance"],["fee","dollar-sign","Fee Status"],["marks","award","Exam Marks"]] as const).map(([id, icon, label]) => (
          <TouchableOpacity key={id} style={[s.tab, activeTab===id && s.tabActive]} onPress={() => setActiveTab(id as any)}>
            <Feather name={icon as any} size={14} color={activeTab===id ? "#fff" : colors.mutedForeground} />
            <Text style={[s.tabTxt, activeTab===id && s.tabTxtActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {activeTab === "attendance" && <AttendanceTab session={session} colors={colors} s={s} />}
        {activeTab === "fee" && <FeeTab session={session} colors={colors} s={s} />}
        {activeTab === "marks" && <MarksTab session={session} colors={colors} s={s} />}

        <TouchableOpacity style={s.changePassBtn} onPress={() => { setShowChangePass(true); setCurPass(""); setNewPass(""); setConfirmPass(""); setErrorMsg(""); }}>
          <Feather name="lock" size={15} color={colors.mutedForeground} />
          <Text style={s.changePassTxt}>Change My Password</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showChangePass} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Change Password</Text>
            {errorMsg ? <Text style={s.errTxt}>{errorMsg}</Text> : null}
            {[["Current Password", curPass, setCurPass], ["New Password", newPass, setNewPass], ["Confirm New Password", confirmPass, setConfirmPass]].map(([label, val, setter]: any) => (
              <View key={label} style={s.inputRow}>
                <Feather name="lock" size={16} color={colors.mutedForeground} />
                <TextInput style={s.input} value={val} onChangeText={setter} placeholder={label} placeholderTextColor={colors.mutedForeground} secureTextEntry />
              </View>
            ))}
            <TouchableOpacity style={s.modalBtn} onPress={handleChangePassword}>
              <Text style={s.modalBtnTxt}>Save Password</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowChangePass(false)}>
              <Text style={{ textAlign: "center", color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Attendance Tab ──────────────────────────────────────
function AttendanceTab({ session, colors, s }: any) {
  const [data, setData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const API_BASE2 = `https://${process.env.EXPO_PUBLIC_DOMAIN || "classes-record.onrender.com"}/api`;

  React.useEffect(() => {
    fetch(`${API_BASE2}/student-portal/attendance?scheduleId=${session.scheduleId}&rollNo=${encodeURIComponent(session.rollNo)}&className=${encodeURIComponent(session.className)}`)
      .then(r => r.json()).then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session.scheduleId, session.rollNo]);

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />;
  if (!data.length) return <View style={{ alignItems: "center", marginTop: 40 }}><Feather name="calendar" size={40} color={colors.mutedForeground} /><Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: "Inter_400Regular" }}>No attendance records yet</Text></View>;

  return (
    <View>
      {data.map((subj: any, i: number) => {
        const pct = subj.total > 0 ? Math.round((subj.present / subj.total) * 100) : 0;
        const color = pct >= 75 ? "#2E7D32" : pct >= 60 ? "#F57F17" : "#C62828";
        return (
          <View key={i} style={s.card}>
            <Text style={s.cardTitle}>{subj.subject}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground }}>{subj.className}</Text>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color }}>{pct}%</Text>
            </View>
            <View style={{ height: 8, backgroundColor: colors.muted, borderRadius: 4, overflow: "hidden" }}>
              <View style={{ width: `${pct}%`, height: 8, backgroundColor: color, borderRadius: 4 }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              {[["Present", subj.present, "#2E7D32"], ["Absent", subj.absent, "#C62828"], ["Late", subj.late||0, "#F57F17"], ["Total", subj.total, colors.foreground]].map(([l, v, c]: any) => (
                <View key={l} style={{ alignItems: "center" }}>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 15, color: c }}>{v}</Text>
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10, color: colors.mutedForeground }}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Fee Tab ──────────────────────────────────────────────
function FeeTab({ session, colors, s }: any) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const API_BASE2 = `https://${process.env.EXPO_PUBLIC_DOMAIN || "classes-record.onrender.com"}/api`;

  React.useEffect(() => {
    fetch(`${API_BASE2}/finance/student-fee?regNo=${encodeURIComponent(session.rollNo)}`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session.rollNo]);

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />;
  if (!data || !data.payments?.length) return <View style={{ alignItems: "center", marginTop: 40 }}><Feather name="dollar-sign" size={40} color={colors.mutedForeground} /><Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: "Inter_400Regular" }}>No fee records found</Text></View>;

  return (
    <View>
      <View style={s.card}>
        <Text style={s.cardTitle}>Fee Status — {data.name}</Text>
        {data.payments.map((p: any, i: number) => (
          <View key={i} style={s.row}>
            <View>
              <Text style={s.rowLabel}>{p.period}</Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground }}>{p.note || ""}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[s.rowValue, { color: p.status === "paid" ? "#2E7D32" : "#C62828" }]}>
                Rs {Number(p.amount || 0).toLocaleString()}
              </Text>
              <View style={{ backgroundColor: p.status === "paid" ? "#E8F5E9" : "#FFEBEE", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: p.status === "paid" ? "#2E7D32" : "#C62828" }}>
                  {(p.status || "pending").toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Exam Marks Tab ───────────────────────────────────────
function MarksTab({ session, colors, s }: any) {
  const [data, setData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const API_BASE2 = `https://${process.env.EXPO_PUBLIC_DOMAIN || "classes-record.onrender.com"}/api`;

  React.useEffect(() => {
    fetch(`${API_BASE2}/student-portal/marks?scheduleId=${session.scheduleId}&rollNo=${encodeURIComponent(session.rollNo)}&className=${encodeURIComponent(session.className)}`)
      .then(r => r.json()).then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session.scheduleId, session.rollNo]);

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />;
  if (!data.length) return <View style={{ alignItems: "center", marginTop: 40 }}><Feather name="award" size={40} color={colors.mutedForeground} /><Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: "Inter_400Regular" }}>No exam marks recorded yet</Text></View>;

  return (
    <View>
      {data.map((subj: any, i: number) => (
        <View key={i} style={s.card}>
          <Text style={s.cardTitle}>{subj.subject}</Text>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginBottom: 10 }}>{subj.className}</Text>
          {[["Quiz", subj.quiz, subj.quizTotal], ["Mid", subj.mid, subj.midTotal], ["Final", subj.final, subj.finalTotal]].map(([label, score, total]: any) => {
            if (score == null) return null;
            const pct = total > 0 ? Math.round((score / total) * 100) : 0;
            const c = pct >= 60 ? "#2E7D32" : "#C62828";
            return (
              <View key={label} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: colors.foreground }}>{label}</Text>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 12, color: c }}>{score}/{total} ({pct}%)</Text>
                </View>
                <View style={{ height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: "hidden" }}>
                  <View style={{ width: `${pct}%`, height: 6, backgroundColor: c, borderRadius: 3 }} />
                </View>
              </View>
            );
          })}
          {subj.totalScore != null && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: colors.foreground }}>Total</Text>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: subj.totalScore >= 60 ? "#2E7D32" : "#C62828" }}>{subj.totalScore}/{subj.grandTotal}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
