import {AppAlert as Alert} from '../../../src/utils/alert';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../../src/store/useCartStore';
import { useAuthStore } from '../../../src/store/useAuthStore';
import { formatVnd } from '../../../src/utils/format';
import { useBreakpoint } from '../../../src/hooks/useBreakpoint';
import CustomerPageIntro from '../../../src/components/CustomerPageIntro';
import COLORS from '../../../src/theme/colors';
import { resolveMediaUrl } from '../../../src/utils/media';

export default function CartScreen() {
  const router = useRouter();
  const { isDesktop } = useBreakpoint();
  const {
    items,
    subtotal,
    totalItems,
    selectedStoreName,
    isLoading,
    fetchCart,
    updateQty,
    removeItem,
    clearCart,
  } = useCartStore();

  const { isAuthenticated } = useAuthStore();
  const [pending, setPending] = useState(false);
  const runCartAction = async (action: () => Promise<void>) => {
    if (pending) return;
    setPending(true);
    try { await action(); }
    catch (error: any) { Alert.alert('VQ FRUIT', error.message || 'Chưa cập nhật được giỏ hàng. Vui lòng thử lại.'); }
    finally { setPending(false); }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleUpdateQty = async (itemId: number, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      Alert.alert(
        'Xóa sản phẩm',
        'Bạn có chắc chắn muốn bỏ sản phẩm này khỏi giỏ hàng?',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Xóa', style: 'destructive', onPress: () => runCartAction(() => removeItem(itemId)) },
        ]
      );
    } else {
      await runCartAction(() => updateQty(itemId, newQty));
    }
  };

  const handleCheckoutPress = () => {
    if (items.length === 0) {
      Alert.alert('Giỏ hàng trống', 'Vui lòng chọn sản phẩm vào giỏ hàng trước khi thanh toán.');
      return;
    }
    router.push('/(customer)/checkout');
  };

  // Free shipping threshold: 500,000 VND
  const shippingFee = subtotal >= 500000 || subtotal === 0 ? 0 : 25000;
  const grandTotal = subtotal + shippingFee;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pageContent}>
      <CustomerPageIntro title="Giỏ hàng của bạn" subtitle="Những thức quả bạn chọn, chuẩn bị cho một ngày tươi lành."/>
      {/* Store branch banner */}
      <TouchableOpacity
        style={styles.storeBanner}
        onPress={() => router.push('/(customer)/stores')}
      >
        <Ionicons name="storefront-outline" size={18} color={COLORS.purpleDark} />
        <View style={styles.storeBannerContent}>
          <Text style={styles.storeBannerTitle}>Cửa hàng chuẩn bị đơn:</Text>
          <Text style={styles.storeBannerName} numberOfLines={1}>
            {selectedStoreName}
          </Text>
        </View>
        <Text style={styles.changeStoreLink}>Đổi chi nhánh</Text>
      </TouchableOpacity>

      {isLoading && items.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Đang cập nhật giỏ hàng...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="bag-handle-outline" size={64} color={COLORS.purple}/>
          <Text style={styles.emptyCartTitle}>Giỏ hàng của bạn đang trống</Text>
          <Text style={styles.emptyCartSubtitle}>
            Hãy khám phá các loại trái cây tươi ngon nhập khẩu và giỏ quà biếu cao cấp của VQ FRUIT!
          </Text>
          <TouchableOpacity
            style={styles.shopNowBtn}
            onPress={() => router.push('/(customer)/(tabs)/categories')}
          >
            <Text style={styles.shopNowBtnText}>KHÁM PHÁ SẢN PHẨM NGAY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.cartLayout, isDesktop && { flexDirection: 'row', alignItems: 'flex-start' }]}>
          <View style={styles.itemsList}>
            <View style={styles.cartHeaderRow}>
              <Text style={styles.cartCountText}>Đang có {totalItems} sản phẩm</Text>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Xóa toàn bộ giỏ hàng', 'Bạn có chắc chắn muốn làm trống giỏ hàng?', [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Xóa hết', style: 'destructive', onPress: () => runCartAction(clearCart) },
                  ])
                }
              >
                <Text style={styles.clearCartText}>Làm trống giỏ</Text>
              </TouchableOpacity>
            </View>

            {items.map((item) => (
              <View key={item.id} style={styles.cartCard}>
                <Image
                  source={{
                    uri: resolveMediaUrl(item.thumbnail),
                  }}
                  style={styles.itemImage}
                />
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.product_name}
                  </Text>
                  <Text style={styles.itemVariant}>Quy cách: {item.variant_label}</Text>
                  
                  <Text style={styles.itemPrice}>{formatVnd(item.unit_price)}</Text>

                  <View style={styles.qtyRow}>
                    <View style={styles.counterBox}>
                      <TouchableOpacity
                        accessibilityLabel="Giảm số lượng" disabled={pending} style={[styles.counterBtn, pending && { opacity: 0.5 }]}
                        onPress={() => handleUpdateQty(item.id, item.qty, -1)}
                      >
                        <Text style={styles.counterBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>{item.qty}</Text>
                      <TouchableOpacity
                        accessibilityLabel="Tăng số lượng" disabled={pending} style={styles.counterBtn}
                        onPress={() => handleUpdateQty(item.id, item.qty, 1)}
                      >
                        <Text style={styles.counterBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.lineTotal}>{formatVnd(item.unit_price * item.qty)}</Text>

                    <TouchableOpacity
                      accessibilityLabel="Xóa sản phẩm" disabled={pending} style={styles.deleteBtn}
                      onPress={() => runCartAction(() => removeItem(item.id))}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.redSale} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {/* Free shipping banner if subtotal < 500k */}
            {subtotal < 500000 && (
              <View style={styles.shippingNoticeBox}>
                <Text style={styles.shippingNoticeText}>
                  🚚 Mua thêm <Text style={styles.bold}>{formatVnd(500000 - subtotal)}</Text> để được{' '}
                  <Text style={styles.bold}>MIỄN PHÍ VẬN CHUYỂN</Text>!
                </Text>
              </View>
            )}

            {/* Trust highlights */}
            <View style={styles.trustCard}>
              <View style={styles.trustItem}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.greenCheck} />
                <Text style={styles.trustText}>Cam kết đổi trả 100% trong vòng 48h</Text>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="ribbon" size={16} color={COLORS.gold} />
                <Text style={styles.trustText}>Tặng kèm thiệp & thắt nơ lụa trang nhã</Text>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="card" size={16} color={COLORS.purple} />
                <Text style={styles.trustText}>Thanh toán VietQR tiện lợi hoặc ship COD</Text>
              </View>
            </View>
          </View>

          {/* Bottom Checkout Panel */}
          <View style={[styles.bottomBar, isDesktop && { width: 360 } ]}>
            <Text style={styles.summaryTitle}>Tóm tắt đơn hàng</Text>
            <View style={styles.priceSummaryRow}>
              <Text style={styles.summaryLabel}>Tạm tính:</Text>
              <Text style={styles.summaryValue}>{formatVnd(subtotal)}</Text>
            </View>

            <View style={styles.priceSummaryRow}>
              <Text style={styles.summaryLabel}>Phí giao hàng dự kiến:</Text>
              <Text style={styles.summaryValue}>
                {shippingFee === 0 ? 'MIỄN PHÍ' : formatVnd(shippingFee)}
              </Text>
            </View>

            <View style={[styles.priceSummaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Tổng thanh toán:</Text>
              <Text style={styles.totalValue}>{formatVnd(grandTotal)}</Text>
            </View>

            <Text style={{fontSize: 12, color: COLORS.muted, lineHeight: 19, marginTop: 8}}>Phí giao hàng chính thức sẽ được xác nhận khi đặt hàng.</Text>
            <TouchableOpacity disabled={pending} accessibilityRole="button" style={[styles.checkoutBtn, pending && {opacity: .5}]} onPress={handleCheckoutPress}>
              <Text style={styles.checkoutBtnText}>TIẾN HÀNH ĐẶT HÀNG →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pageContent: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 36 },
  cartLayout: { gap: 24, paddingTop: 24 },
  summaryTitle: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: 24 },
  container: { flex: 1, backgroundColor: COLORS.bg },
  storeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purpleLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    minHeight: 76,
  },
  storeBannerContent: { flex: 1, marginHorizontal: 8 },
  storeBannerTitle: { fontSize: 10, color: COLORS.muted },
  storeBannerName: { fontSize: 12, fontWeight: '700', color: COLORS.purpleDark },
  changeStoreLink: { fontSize: 11, color: COLORS.purple, fontWeight: '700' },
  itemsList: { flex: 1, minWidth: 0 },
  itemsListContent: { padding: 16, paddingBottom: 20 },
  cartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cartCountText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  clearCartText: { fontSize: 12, color: COLORS.redSale, fontWeight: '600' },
  cartCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemImage: { width: 96, height: 110, borderRadius: 8, backgroundColor: '#F3F4F6' },
  itemDetails: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  itemName: { fontSize: 16, fontWeight: '600', color: COLORS.text, lineHeight: 24 },
  itemVariant: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: '800', color: COLORS.purpleDark, marginTop: 2 },
  qtyRow: { flexWrap: 'wrap', gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  counterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    backgroundColor: COLORS.inputBg,
  },
  counterBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  counterBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  counterValue: { fontSize: 12, fontWeight: '700', color: COLORS.text, minWidth: 22, textAlign: 'center' },
  lineTotal: { fontSize: 13, fontWeight: '800', color: COLORS.redSale },
  deleteBtn: { padding: 12, minHeight: 44 },
  shippingNoticeBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    marginBottom: 14,
  },
  shippingNoticeText: { fontSize: 12, color: '#1E40AF', textAlign: 'center' },
  bold: { fontWeight: '700' },
  trustCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustText: { flex: 1, fontSize: 12, color: COLORS.text },
  bottomBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 6,
  },
  priceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: { fontSize: 12, color: COLORS.muted },
  summaryValue: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  totalRow: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  totalLabel: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  totalValue: { fontSize: 16, fontWeight: '900', color: COLORS.redSale },
  checkoutBtn: {
    backgroundColor: COLORS.purple,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  checkoutBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 13, color: COLORS.muted },
  emptyCartEmoji: { fontSize: 56, marginBottom: 12 },
  emptyCartTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  emptyCartSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  shopNowBtn: { backgroundColor: COLORS.purple, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  shopNowBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
});
