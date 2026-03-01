import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { createRoom } from '../lib/api';
import { useGameStore } from '../store/gameStore';
import { router } from 'expo-router';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function CreateRoomModal({ visible, onClose }: Props) {
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4);
  const [withBots, setWithBots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { username, guestToken, setRoomCode, showToast } = useGameStore();

  const handleCreate = async () => {
    if (!guestToken) {
      setError('Chưa đăng nhập. Vui lòng thử lại.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await createRoom({ username, maxPlayers, withBots, guestToken });
      if (data.roomCode) {
        setRoomCode(data.roomCode);
        onClose();
        router.push(`/game/${data.roomCode}`);
      } else {
        setError(data.error || 'Không thể tạo phòng');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Tạo Phòng Mới</Text>

          {/* Max players selection */}
          <Text style={styles.label}>Số người chơi</Text>
          <View style={styles.optionsRow}>
            {([2, 3, 4] as const).map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.optionButton, maxPlayers === n && styles.optionSelected]}
                onPress={() => setMaxPlayers(n)}
              >
                <Text style={[styles.optionText, maxPlayers === n && styles.optionTextSelected]}>
                  {n} người
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bot toggle */}
          <View style={styles.switchRow}>
            <Text style={styles.label}>Thêm Bot tự động</Text>
            <Switch
              value={withBots}
              onValueChange={setWithBots}
              trackColor={{ false: '#374151', true: '#e94560' }}
              thumbColor={withBots ? '#ffffff' : '#9ca3af'}
            />
          </View>
          {withBots && (
            <Text style={styles.hint}>
              Bot sẽ được thêm để lấp chỗ trống khi bắt đầu
            </Text>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, loading && styles.disabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.createText}>Tạo Phòng</Text>
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
    borderTopColor: '#e94560',
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
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#374151',
    alignItems: 'center',
  },
  optionSelected: {
    borderColor: '#e94560',
    backgroundColor: '#e9456020',
  },
  optionText: {
    color: '#9ca3af',
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#e94560',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  hint: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 16,
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
    marginTop: 16,
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
  createButton: {
    flex: 2,
    backgroundColor: '#e94560',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  createText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.6,
  },
});
