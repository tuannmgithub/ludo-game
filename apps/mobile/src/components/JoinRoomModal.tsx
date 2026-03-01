import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { joinRoom } from '../lib/api';
import { useGameStore } from '../store/gameStore';
import { router } from 'expo-router';

interface Props {
  visible: boolean;
  onClose: () => void;
  prefillCode?: string;
}

export function JoinRoomModal({ visible, onClose, prefillCode = '' }: Props) {
  const [roomCode, setRoomCode] = useState(prefillCode.toUpperCase());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { username, guestToken, setRoomCode: setStoreRoomCode } = useGameStore();

  const handleJoin = async () => {
    const code = roomCode.trim().toUpperCase();
    if (!code || code.length < 4) {
      setError('Nhập mã phòng hợp lệ (ít nhất 4 ký tự)');
      return;
    }
    if (!guestToken) {
      setError('Chưa đăng nhập. Vui lòng thử lại.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await joinRoom(code, { username, guestToken });
      if (data.error) {
        setError(data.error);
      } else {
        setStoreRoomCode(code);
        onClose();
        router.push(`/game/${code}`);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể vào phòng');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (text: string) => {
    setRoomCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));
    setError(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Vào Phòng</Text>

          <Text style={styles.label}>Mã Phòng</Text>
          <TextInput
            style={styles.input}
            value={roomCode}
            onChangeText={handleCodeChange}
            placeholder="Nhập mã phòng..."
            placeholderTextColor="#6b7280"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            autoFocus
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.joinButton, loading && styles.disabled]}
              onPress={handleJoin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.joinText}>Vào Phòng</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 2,
    borderTopColor: '#3b82f6',
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 4,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
  },
  cancelText: {
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: '600',
  },
  joinButton: {
    flex: 2,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.6,
  },
});
