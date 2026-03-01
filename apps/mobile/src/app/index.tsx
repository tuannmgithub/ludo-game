import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { getRooms, quickMatch, guestAuth } from '../lib/api';
import { storage } from '../lib/storage';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { JoinRoomModal } from '../components/JoinRoomModal';
import * as Haptics from 'expo-haptics';

interface RoomInfo {
  roomCode: string;
  playerCount: number;
  maxPlayers: number;
  status: string;
}

export default function HomeScreen() {
  const {
    username,
    setUsername,
    guestToken,
    setGuestToken,
    setMyPlayerId,
    setRoomCode,
    showToast,
  } = useGameStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingQuickMatch, setLoadingQuickMatch] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState(username);

  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const data = await getRooms();
      setRooms(
        (data.rooms || []).filter((r: any) => r.status === 'waiting')
      );
    } catch {
      // Silently fail - server may not be running
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const handleSaveUsername = async () => {
    const name = tempUsername.trim();
    if (!name) return;
    setUsername(name);
    setEditingUsername(false);
    await storage.setUsername(name);

    // Re-auth with new username to get fresh credentials
    try {
      const creds = await guestAuth();
      setMyPlayerId(creds.playerId);
      setGuestToken(creds.guestToken);
      setUsername(name); // Keep our chosen name
      await storage.setCredentials({ ...creds, username: name });
    } catch {
      // Keep existing creds
    }
  };

  const handleQuickMatch = async () => {
    if (!guestToken) {
      showToast('Đang kết nối...', 'info');
      return;
    }
    setLoadingQuickMatch(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    try {
      const data = await quickMatch({ username, guestToken });
      if (data.roomCode) {
        setRoomCode(data.roomCode);
        router.push(`/game/${data.roomCode}`);
      } else {
        showToast(data.error || 'Không tìm được phòng', 'error');
      }
    } catch (err: any) {
      showToast('Không thể kết nối server', 'error');
    } finally {
      setLoadingQuickMatch(false);
    }
  };

  const handleJoinPublicRoom = (roomCode: string) => {
    setRoomCode(roomCode);
    router.push(`/game/${roomCode}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={loadingRooms}
            onRefresh={fetchRooms}
            tintColor="#e94560"
          />
        }
      >
        {/* Header / Logo */}
        <View style={styles.header}>
          <Text style={styles.gameTitle}>Co Ca Ngua</Text>
          <Text style={styles.gameSubtitle}>Ludo trực tuyến</Text>
        </View>

        {/* Username section */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Tên người chơi</Text>
          {editingUsername ? (
            <View style={styles.usernameEditRow}>
              <TextInput
                style={styles.usernameInput}
                value={tempUsername}
                onChangeText={setTempUsername}
                placeholder="Nhập tên..."
                placeholderTextColor="#6b7280"
                maxLength={20}
                autoFocus
                onSubmitEditing={handleSaveUsername}
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUsername}>
                <Text style={styles.saveBtnText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.usernameDisplay}
              onPress={() => {
                setTempUsername(username);
                setEditingUsername(true);
              }}
            >
              <Text style={styles.usernameText}>{username}</Text>
              <Text style={styles.editHint}>Nhấn để đổi</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Main action buttons */}
        <View style={styles.actionsContainer}>
          {/* Quick match */}
          <TouchableOpacity
            style={[styles.actionButton, styles.quickMatchButton]}
            onPress={handleQuickMatch}
            disabled={loadingQuickMatch}
            activeOpacity={0.8}
          >
            {loadingQuickMatch ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Text style={styles.actionIcon}>⚡</Text>
                <View>
                  <Text style={styles.actionButtonText}>Choi Nhanh</Text>
                  <Text style={styles.actionSubtext}>Ghép trận ngay</Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.actionRow}>
            {/* Create room */}
            <TouchableOpacity
              style={[styles.actionButton, styles.createButton, styles.halfButton]}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>+</Text>
              <View>
                <Text style={styles.actionButtonText}>Tao Phong</Text>
                <Text style={styles.actionSubtext}>Mời bạn bè</Text>
              </View>
            </TouchableOpacity>

            {/* Join room */}
            <TouchableOpacity
              style={[styles.actionButton, styles.joinButton, styles.halfButton]}
              onPress={() => setShowJoinModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>→</Text>
              <View>
                <Text style={styles.actionButtonText}>Vao Phong</Text>
                <Text style={styles.actionSubtext}>Nhập mã</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Public rooms list */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Phòng Công Khai</Text>
            <TouchableOpacity onPress={fetchRooms}>
              <Text style={styles.refreshText}>Làm mới</Text>
            </TouchableOpacity>
          </View>

          {loadingRooms && rooms.length === 0 ? (
            <ActivityIndicator color="#e94560" style={{ marginVertical: 20 }} />
          ) : rooms.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có phòng nào. Tạo phòng mới!</Text>
          ) : (
            rooms.map((room) => (
              <TouchableOpacity
                key={room.roomCode}
                style={styles.roomRow}
                onPress={() => handleJoinPublicRoom(room.roomCode)}
              >
                <View>
                  <Text style={styles.roomCode}>{room.roomCode}</Text>
                  <Text style={styles.roomStatus}>
                    {room.playerCount}/{room.maxPlayers} người
                  </Text>
                </View>
                <View style={styles.joinBadge}>
                  <Text style={styles.joinBadgeText}>Vào</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Version info */}
        <Text style={styles.version}>v1.0.0 • Co Ca Ngua Online</Text>
      </ScrollView>

      <CreateRoomModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <JoinRoomModal visible={showJoinModal} onClose={() => setShowJoinModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  gameTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#e94560',
    letterSpacing: 2,
    textShadowColor: 'rgba(233, 69, 96, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  gameSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 4,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  usernameEditRow: {
    flexDirection: 'row',
    gap: 8,
  },
  usernameInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e94560',
  },
  saveBtn: {
    backgroundColor: '#e94560',
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  usernameDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 10,
  },
  usernameText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  editHint: {
    color: '#6b7280',
    fontSize: 12,
  },
  actionsContainer: {
    marginBottom: 16,
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  halfButton: {
    flex: 1,
  },
  quickMatchButton: {
    backgroundColor: '#7c3aed',
    shadowColor: '#7c3aed',
  },
  createButton: {
    backgroundColor: '#e94560',
    shadowColor: '#e94560',
  },
  joinButton: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
  },
  actionIcon: {
    fontSize: 28,
    color: '#ffffff',
    width: 36,
    textAlign: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  actionSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '700',
  },
  refreshText: {
    color: '#e94560',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
  roomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  roomCode: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  roomStatus: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  joinBadge: {
    backgroundColor: '#e94560',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinBadgeText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  version: {
    color: '#374151',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
