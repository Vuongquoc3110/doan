import {AppAlert as Alert} from '../../../../src/utils/alert';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  
  Image,
  Platform} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../../../../src/api/client';
import COLORS from '../../../../src/theme/colors';

const RETURN_REASONS = [
  'Trái cây bị dập nát trong quá trình giao hàng',
  'Chất lượng không đạt chuẩn (chua, ủng, thâm ruột)',
  'Giao sai phân loại hoặc thiếu số lượng',
  'Hộp / Giỏ quà biếu bị rách nát, bung nơ',
  'Lý do khác',
];

export default function OrderReturnScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [selectedReason, setSelectedReason] = useState(RETURN_REASONS[0]);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [bankName, setBankName] = useState('Vietcombank');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch Order Details
  const { data: order, isLoading } = useQuery({
    queryKey: ['order-for-return', id],
    queryFn: async () => {
      const res = await apiClient.get(`/v1/orders/${id}`);
      return res.data?.data;
    },
  });

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch {
      Alert.alert('Thông báo', 'Không thể mở thư viện ảnh');
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Thông báo', 'Vui lòng mô tả chi tiết tình trạng sản phẩm cần đổi trả');
      return;
    }

    try {
      setSubmitting(true);

      const uploadedImages: string[] = [];
      for (const uri of images) {
        const form = new FormData();
        if (Platform.OS === 'web') {
          const blob = await (await fetch(uri)).blob();
          form.append('image', blob, 'return-evidence.jpg');
        } else {
          form.append('image', { uri, name: 'return-evidence.jpg', type: 'image/jpeg' } as any);
        }
        const upload = await apiClient.post('/v1/upload/image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        uploadedImages.push(upload.data.data.url);
      }
      const payload = {
        reason: `${selectedReason}: ${description.trim()}${accountNumber ? ` | Hoàn tiền: ${bankName} - ${accountNumber} - ${accountName}` : ''}`,
        description: description.trim(),
        images: uploadedImages,
        refund_bank_info: accountNumber
          ? `${bankName} - STK: ${accountNumber} - Tên: ${accountName}`
          : undefined,
      };

      await apiClient.post(`/v1/orders/${id}/return-request`, payload);

      Alert.alert(
        'Đã gửi yêu cầu đổi trả! 🛡️',
        'VQ FRUIT cam kết xử lý khiếu nại trong vòng 2 giờ. Quản lý chi nhánh sẽ gọi điện trực tiếp để xác nhận và điều phối nhân viên tới tận nơi đổi trả miễn phí.',
        [{ text: 'Đồng ý', onPress: () => router.replace(`/(customer)/order/${id}`) }]
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể tạo yêu cầu đổi trả');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={COLORS.purple} />
        <Text style={styles.loadingText}>Đang tải thông tin đơn hàng...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Commitment Banner */}
      <View style={styles.banner}>
        <Ionicons name="shield-checkmark" size={28} color={COLORS.greenCheck} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.bannerTitle}>CAM KẾT BẢO HÀNH 48H VQ FRUIT</Text>
          <Text style={styles.bannerText}>
            Đổi sản phẩm mới hoặc hoàn tiền 100% trong vòng 48h nếu phát hiện trái cây kém chất lượng.
          </Text>
        </View>
      </View>

      {/* Order info badge */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ĐƠN HÀNG ÁP DỤNG ĐỔI TRẢ</Text>
        <Text style={styles.orderCode}>Mã đơn: {order?.code || `#${id}`}</Text>
        <Text style={styles.orderStore}>Chi nhánh: {order?.store_name}</Text>
      </View>

      {/* Reason Selection */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>LÝ DO ĐỔI TRẢ (*)</Text>
        {RETURN_REASONS.map((reason) => (
          <TouchableOpacity
            key={reason}
            style={[styles.reasonOption, selectedReason === reason && styles.reasonOptionActive]}
            onPress={() => setSelectedReason(reason)}
          >
            <Ionicons
              name={selectedReason === reason ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={COLORS.purple}
            />
            <Text
              style={[styles.reasonText, selectedReason === reason && styles.reasonTextActive]}
            >
              {reason}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Description */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>MÔ TẢ CHI TIẾT LỖI SẢN PHẨM (*)</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Mô tả cụ thể vị trí trái hỏng, dập, hoặc không đúng đơn hàng..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />
      </View>

      {/* Photo evidence upload */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>HÌNH ẢNH MINH CHỨNG (ẢNH CHỤP SẢN PHẨM)</Text>
        <Text style={styles.cardHelp}>
          Vui lòng chụp ảnh cận cảnh trái cây bị lỗi kèm tem mác để CSKH hỗ trợ xử lý nhanh nhất.
        </Text>

        <View style={styles.imagesRow}>
          {images.map((uri, index) => (
            <View key={index} style={styles.imagePreviewWrapper}>
              <Image source={{ uri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setImages(images.filter((_, i) => i !== index))}
              >
                <Ionicons name="close" size={14} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          ))}

          {images.length < 3 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
              <Ionicons name="camera-outline" size={24} color={COLORS.purple} />
              <Text style={styles.addPhotoText}>Thêm ảnh</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Bank refund information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>THÔNG TIN TÀI KHOẢN HOÀN TIỀN (NẾU HOÀN TIỀN)</Text>
        <TextInput
          style={styles.input}
          placeholder="Tên ngân hàng (Vietcombank, MB, Techcombank...)"
          value={bankName}
          onChangeText={setBankName}
        />
        <TextInput
          style={styles.input}
          placeholder="Số tài khoản ngân hàng"
          keyboardType="number-pad"
          value={accountNumber}
          onChangeText={setAccountNumber}
        />
        <TextInput
          style={styles.input}
          placeholder="Họ và tên chủ tài khoản"
          value={accountName}
          onChangeText={setAccountName}
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.submitBtnText}>GỬI YÊU CẦU ĐỔI TRẢ NGAY</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  bannerTitle: { fontSize: 12, fontWeight: '800', color: COLORS.greenCheck },
  bannerText: { fontSize: 11, color: '#166534', marginTop: 2, lineHeight: 16 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 12, fontWeight: '800', color: COLORS.purpleDark, marginBottom: 10 },
  cardHelp: { fontSize: 11, color: COLORS.muted, marginBottom: 12, lineHeight: 16 },
  orderCode: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  orderStore: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  reasonOptionActive: { backgroundColor: COLORS.purpleLight, borderRadius: 6, paddingHorizontal: 6 },
  reasonText: { fontSize: 12, color: COLORS.text, flex: 1 },
  reasonTextActive: { fontWeight: '700', color: COLORS.purpleDark },
  textArea: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 13,
    color: COLORS.text,
    textAlignVertical: 'top',
    height: 100,
  },
  imagesRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  imagePreviewWrapper: { position: 'relative' },
  previewImage: { width: 80, height: 80, borderRadius: 8 },
  removeImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.redSale,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.purple,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purpleLight,
  },
  addPhotoText: { fontSize: 10, color: COLORS.purple, fontWeight: '700', marginTop: 4 },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 8,
  },
  submitBtn: {
    backgroundColor: COLORS.purple,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 13, color: COLORS.muted },
});
