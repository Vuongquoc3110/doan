import {AppAlert as Alert} from '../../src/utils/alert';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  
  FlatList} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { formatVnd } from '../../src/utils/format';
import COLORS from '../../src/theme/admin';
import {AdminMarketingPanel} from '../../src/components/AdminMarketingPanel';

export default function AdminMarketingScreen() {
  const [activeTab, setActiveTab] = useState<'coupon' | 'giftcard'>('giftcard');

  // Gift Card Generator state
  const [cardQuantity, setCardQuantity] = useState('5');
  const [cardBalance, setCardBalance] = useState('1000000');
  const [generating, setGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<any[]>([]);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponName, setCouponName] = useState('');
  const [discountAmount, setDiscountAmount] = useState('50000');
  const [minOrder, setMinOrder] = useState('500000');
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  const handleGenerateGiftCards = async () => {
    const qty = parseInt(cardQuantity, 10);
    const balance = parseInt(cardBalance, 10);

    if (isNaN(qty) || qty <= 0 || isNaN(balance) || balance <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập số lượng và mệnh giá hợp lệ');
      return;
    }

    try {
      setGenerating(true);
      const res = await apiClient.post('/v1/admin/gift-cards/bulk-generate', {
        count: qty,
        balance,
      });

      const cards = (res.data?.data?.codes || []).map((code: string) => ({ code, balance }));
      setGeneratedCards(cards);
      Alert.alert(
        'Thành công! 🎁',
        `Đã sinh thành công ${cards.length} thẻ quà tặng mệnh giá ${formatVnd(balance)}.`
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể sinh mã thẻ quà tặng');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateCoupon = async () => {
    if (!couponCode.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập mã giảm giá');
      return;
    }

    try {
      setCreatingCoupon(true);
      await apiClient.post('/v1/admin/coupons', {
        code: couponCode.trim().toUpperCase(),
        name: couponName.trim() || `Giảm ${formatVnd(Number(discountAmount))}`,
        type: 'fixed',
        value: Number(discountAmount),
        min_order: Number(minOrder),
        expires_at: '2026-12-31',
      });

      Alert.alert('Thành công! 🎟️', `Đã tạo mã giảm giá: ${couponCode.toUpperCase()}`);
      setCouponCode('');
      setCouponName('');
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể tạo mã giảm giá');
    } finally {
      setCreatingCoupon(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AdminMarketingPanel/>
      {/* Switcher Tab */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'giftcard' && styles.tabBtnActive]}
          onPress={() => setActiveTab('giftcard')}
        >
          <Ionicons
            name="card"
            size={16}
            color={activeTab === 'giftcard' ? COLORS.purpleDark : COLORS.muted}
          />
          <Text
            style={[styles.tabBtnText, activeTab === 'giftcard' && styles.tabBtnTextActive]}
          >
            Thẻ Quà Tặng Gift Card
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'coupon' && styles.tabBtnActive]}
          onPress={() => setActiveTab('coupon')}
        >
          <Ionicons
            name="ticket"
            size={16}
            color={activeTab === 'coupon' ? COLORS.purpleDark : COLORS.muted}
          />
          <Text
            style={[styles.tabBtnText, activeTab === 'coupon' && styles.tabBtnTextActive]}
          >
            Tạo Mã Voucher Giảm Giá
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'giftcard' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SINH THẺ QUÀ TẶNG DOANH NGHIỆP HÀNG LOẠT</Text>
          <Text style={styles.cardSub}>
            Hệ thống sẽ sinh mã thẻ bí mật 16 chữ số chuẩn bảo mật cho đối tác biếu tặng.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số lượng thẻ cần tạo:</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={cardQuantity}
              onChangeText={setCardQuantity}
              placeholder="Ví dụ: 10"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mệnh giá mỗi thẻ (VNĐ):</Text>
            <View style={styles.balancePresetsRow}>
              {['500000', '1000000', '2000000', '5000000'].map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.presetPill, cardBalance === b && styles.presetPillActive]}
                  onPress={() => setCardBalance(b)}
                >
                  <Text
                    style={[
                      styles.presetText,
                      cardBalance === b && styles.presetTextActive,
                    ]}
                  >
                    {formatVnd(Number(b))}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, generating && styles.btnDisabled]}
            onPress={handleGenerateGiftCards}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.actionBtnText}>
                SINH {cardQuantity} THẺ ({formatVnd(Number(cardBalance))})
              </Text>
            )}
          </TouchableOpacity>

          {/* Generated Cards Result */}
          {generatedCards.length > 0 && (
            <View style={styles.resultsBox}>
              <Text style={styles.resultsTitle}>DANH SÁCH MÃ THẺ VỪA SINH THÀNH CÔNG:</Text>
              {generatedCards.map((card, idx) => (
                <View key={idx} style={styles.cardCodeRow}>
                  <Text style={styles.cardCodeIndex}>#{idx + 1}</Text>
                  <Text style={styles.cardCodeNumber}>{card.card_number || card.code}</Text>
                  <Text style={styles.cardCodeBalance}>{formatVnd(card.balance)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>TẠO MÃ GIẢM GIÁ VOUCHER MỚI</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mã code (*):</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: TRIANKHACH2026"
              autoCapitalize="characters"
              value={couponCode}
              onChangeText={setCouponCode}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tên chương trình:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Tri ân khách hàng thân thiết"
              value={couponName}
              onChangeText={setCouponName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số tiền giảm trực tiếp (VNĐ):</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={discountAmount}
              onChangeText={setDiscountAmount}
              placeholder="50000"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Giá trị đơn hàng tối thiểu (VNĐ):</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={minOrder}
              onChangeText={setMinOrder}
              placeholder="500000"
            />
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, creatingCoupon && styles.btnDisabled]}
            onPress={handleCreateCoupon}
            disabled={creatingCoupon}
          >
            {creatingCoupon ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.actionBtnText}>LƯU MÃ GIẢM GIÁ MỚI</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: {   padding: 20, paddingBottom: 40, gap: 8 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    
    paddingVertical: 10,
    
    gap: 6, minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: COLORS.purpleLight },
  tabBtnText: {  fontWeight: '700', color: COLORS.muted , fontSize: 12 },
  tabBtnTextActive: { color: COLORS.purpleDark },
  card: {
    backgroundColor: COLORS.card,
    
    
    
     borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#dfe8e3' },
  cardTitle: {  fontWeight: '800', color: COLORS.purpleDark, marginBottom: 4 , fontSize: 14 },
  cardSub: {  color: COLORS.muted, marginBottom: 14 , fontSize: 12 },
  inputGroup: { marginBottom: 12 },
  inputLabel: {  fontWeight: '600', color: COLORS.text, marginBottom: 6 , fontSize: 14 },
  input: {
    
    
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    
    color: COLORS.text, minHeight: 48, borderRadius: 10, paddingHorizontal: 14, backgroundColor: '#f8faf9', fontSize: 14 },
  balancePresetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  presetPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg, minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  presetPillActive: { borderColor: COLORS.purple, backgroundColor: COLORS.purpleLight },
  presetText: {  color: COLORS.text, fontWeight: '600' , fontSize: 12 },
  presetTextActive: { color: COLORS.purpleDark, fontWeight: '800' },
  actionBtn: {
    backgroundColor: COLORS.purple,
    
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8, minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  btnDisabled: { opacity: 0.6 },
  actionBtnText: { color: COLORS.white,  fontWeight: '800' , fontSize: 14 },
  resultsBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  resultsTitle: {  fontWeight: '800', color: COLORS.greenCheck, marginBottom: 8 , fontSize: 12 },
  cardCodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  cardCodeIndex: {  color: COLORS.muted, width: 24 , fontSize: 12 },
  cardCodeNumber: {  fontWeight: '800', color: COLORS.purpleDark, letterSpacing: 1 , fontSize: 14 },
  cardCodeBalance: {  fontWeight: '700', color: COLORS.redSale , fontSize: 12 },
});
