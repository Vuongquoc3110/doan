import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../src/theme/colors';

export default function PolicyScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.badgeHeader}>
        <Ionicons name="shield-checkmark" size={32} color={COLORS.greenCheck} />
        <Text style={styles.headerTitle}>CHÍNH SÁCH ĐỔI TRẢ TRONG VÒNG 48 GIỜ</Text>
        <Text style={styles.headerSubtitle}>Cam kết chất lượng vàng từ hệ thống VQ FRUIT</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>1. ĐIỀU KIỆN ÁP DỤNG ĐỔI TRẢ</Text>
        <Text style={styles.paragraph}>
          Quý khách có quyền yêu cầu đổi mới 100% hoặc hoàn lại toàn bộ số tiền đã thanh toán trong các trường hợp sau:
        </Text>
        <View style={styles.bulletItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            Trái cây phát hiện bị dập hỏng, sâu bệnh, ủng nát, thâm đen ruột khi nhận hàng hoặc bổ ra dùng trong 48 giờ.
          </Text>
        </View>
        <View style={styles.bulletItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            Trái cây không đúng chủng loại, nguồn gốc xuất xứ hoặc trọng lượng như đơn đặt hàng đã xác nhận.
          </Text>
        </View>
        <View style={styles.bulletItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            Hộp quà tặng, giỏ quà biếu bị rách nát, biến dạng hoặc rơi vỡ trong quá trình giao nhận hàng.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>2. QUY TRÌNH THỰC HIỆN ĐỔI TRẢ</Text>
        <View style={styles.stepRow}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>1</Text>
          </View>
          <View style={styles.stepInfo}>
            <Text style={styles.stepTitle}>Gửi yêu cầu qua Ứng dụng</Text>
            <Text style={styles.stepDesc}>
              Vào mục "Đơn hàng của tôi" → Chọn đơn đã giao → Bấm "Yêu cầu đổi trả (48h)" và gửi kèm hình ảnh chụp trái cây.
            </Text>
          </View>
        </View>

        <View style={styles.stepRow}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>2</Text>
          </View>
          <View style={styles.stepInfo}>
            <Text style={styles.stepTitle}>Thẩm định và xác nhận trong 2 giờ</Text>
            <Text style={styles.stepDesc}>
              Quản lý chi nhánh tiếp nhận đơn hàng sẽ gọi điện trực tiếp xác minh và thống nhất phương án xử lý với quý khách.
            </Text>
          </View>
        </View>

        <View style={styles.stepRow}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>3</Text>
          </View>
          <View style={styles.stepInfo}>
            <Text style={styles.stepTitle}>Đổi hàng tận nơi hoặc Hoàn tiền</Text>
            <Text style={styles.stepDesc}>
              Nhân viên giao hàng sẽ mang sản phẩm mới tinh tuyển đến tận nhà đổi cho quý khách hoàn toàn MIỄN PHÍ, hoặc chuyển khoản hoàn tiền ngay trong ngày.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>3. TỔNG ĐÀI HỖ TRỢ KHÁCH HÀNG 24/7</Text>
        <Text style={styles.paragraph}>
          Nếu gặp bất kỳ vấn đề nào cần hỗ trợ khẩn cấp, xin vui lòng liên hệ ngay với đường dây nóng của chúng tôi:
        </Text>
        <Text style={styles.hotlineText}>Hotline: 1900 636 586 - 0968 111 888</Text>
        <Text style={styles.emailText}>Email: cskh@kleverfruit.com.vn</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  badgeHeader: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  headerTitle: { fontSize: 14, fontWeight: '900', color: COLORS.greenCheck, marginTop: 8, textAlign: 'center' },
  headerSubtitle: { fontSize: 12, color: '#166534', marginTop: 2 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.purpleDark, marginBottom: 8 },
  paragraph: { fontSize: 13, color: COLORS.text, lineHeight: 19, marginBottom: 10 },
  bulletItem: { flexDirection: 'row', marginBottom: 8 },
  bullet: { fontSize: 16, color: COLORS.purple, marginRight: 8, lineHeight: 18 },
  bulletText: { flex: 1, fontSize: 12, color: COLORS.text, lineHeight: 18 },
  stepRow: { flexDirection: 'row', marginBottom: 14, gap: 12 },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  stepInfo: { flex: 1 },
  stepTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  stepDesc: { fontSize: 12, color: COLORS.muted, marginTop: 2, lineHeight: 17 },
  hotlineText: { fontSize: 14, fontWeight: '800', color: COLORS.purpleDark, marginTop: 6 },
  emailText: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
});
