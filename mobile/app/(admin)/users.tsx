import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import COLORS from '../../src/theme/admin';
import {StaffCreator,Sheet,Action,ErrorText,adminError} from '../../src/components/AdminControls';

const ROLE_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'customer', label: 'Khách hàng' },
  { key: 'staff', label: 'Nhân viên' },
  { key: 'admin', label: 'Quản trị viên' },
];

export default function AdminUsersScreen() {
  const [confirmation,setConfirmation]=useState<any>(null),[updating,setUpdating]=useState(false),[statusError,setStatusError]=useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [search, setSearch] = useState('');

  const {
    data: users = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['admin-users-list', selectedRole, search],
    queryFn: async () => {
      const params: any = { limit: 50 };
      if (selectedRole !== 'all') params.role = selectedRole;
      if (search.trim()) params.search = search.trim();
      const res = await apiClient.get('/v1/admin/users', { params });
      return res.data?.data || [];
    },
  });

  const handleToggleBlock = async (userId: number, currentStatus: string, name: string) => {
    const isCurrentlyActive = currentStatus === 'active';
    const newStatus = isCurrentlyActive ? 'blocked' : 'active';

    setStatusError('');setConfirmation({userId,newStatus,name});
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'ADMIN', bg: '#FDF2F8', color: '#DB2777' };
      case 'staff':
        return { label: 'NHÂN VIÊN', bg: '#EFF6FF', color: '#1D4ED8' };
      default:
        return { label: 'KHÁCH HÀNG', bg: '#F0FDF4', color: '#15803D' };
    }
  };

  return (
    <View style={styles.container}>
      <Sheet visible={!!confirmation} title="Xác nhận trạng thái tài khoản" close={()=>!updating&&setConfirmation(null)}><Text>{confirmation?.newStatus==='blocked'?'Khóa':'Mở khóa'} tài khoản {confirmation?.name}?</Text><ErrorText message={statusError}/><Action label="Xác nhận" busy={updating} onPress={async()=>{setUpdating(true);try{await apiClient.put(`/v1/admin/users/${confirmation.userId}/status`,{status:confirmation.newStatus});setConfirmation(null);refetch();}catch(e){setStatusError(adminError(e));}finally{setUpdating(false);}}}/></Sheet>
      {/* Search Header */}
      <View style={styles.header}>
        <StaffCreator onSaved={()=>refetch()}/>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên hoặc số điện thoại..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.roleTabs}>
          {ROLE_TABS.map((tab) => {
            const active = selectedRole === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.roleTab, active && styles.roleTabActive]}
                onPress={() => setSelectedRole(tab.key)}
              >
                <Text style={[styles.roleTabText, active && styles.roleTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* User list */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Đang tải danh sách người dùng...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={async () => { await refetch(); }} />}
          renderItem={({ item }) => {
            const roleInfo = getRoleBadge(item.role);
            const isBlocked = item.status === 'blocked';

            return (
              <View style={[styles.userCard, isBlocked && styles.userCardBlocked]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{item.full_name || item.fullName || 'Người dùng'}</Text>
                    <Text style={styles.userPhone}>{item.phone}</Text>
                  </View>

                  <View style={[styles.roleBadge, { backgroundColor: roleInfo.bg }]}>
                    <Text style={[styles.roleBadgeText, { color: roleInfo.color }]}>
                      {roleInfo.label}
                    </Text>
                  </View>
                </View>

                {item.store_name && (
                  <Text style={styles.storeAssign}>📍 Trực thuộc: {item.store_name}</Text>
                )}

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: isBlocked ? COLORS.redSale : COLORS.greenCheck },
                      ]}
                    />
                    <Text style={styles.statusText}>
                      {isBlocked ? 'ĐÃ KHÓA' : 'ĐANG HOẠT ĐỘNG'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.blockBtn, isBlocked ? styles.btnUnlock : styles.btnLock]}
                    onPress={() =>
                      handleToggleBlock(item.id, item.status, item.full_name || item.phone)
                    }
                  >
                    <Text style={[styles.blockBtnText, isBlocked ? { color: COLORS.greenCheck } : { color: COLORS.redSale }]}>
                      {isBlocked ? 'Mở khóa' : 'Khóa'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {     padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#dfe8e3', gap: 10 },
  searchInput: {
    
    
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    
    color: COLORS.text,
    marginBottom: 8, minHeight: 48, borderRadius: 10, paddingHorizontal: 14, backgroundColor: '#f8faf9', fontSize: 14 },
  roleTabs: { flexDirection: 'row', gap: 6 },
  roleTab: { flex: 1, paddingVertical: 6, borderRadius: 6, backgroundColor: COLORS.inputBg, alignItems: 'center' },
  roleTabActive: { backgroundColor: COLORS.purpleLight, borderWidth: 1, borderColor: COLORS.purple },
  roleTabText: {  color: COLORS.muted, fontWeight: '600' , fontSize: 12 },
  roleTabTextActive: { color: COLORS.purpleDark, fontWeight: '800' },
  listContent: {   padding: 20, paddingBottom: 40, gap: 8 },
  userCard: {
    backgroundColor: COLORS.card,
    
    
    marginBottom: 10,
    
     borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#dfe8e3' },
  userCardBlocked: { opacity: 0.7, backgroundColor: '#FEF2F2' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userName: {  fontWeight: '800', color: COLORS.text , fontSize: 14 },
  userPhone: {  color: COLORS.muted, marginTop: 2 , fontSize: 12 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleBadgeText: {  fontWeight: '800' , fontSize: 12 },
  storeAssign: {  color: COLORS.purpleDark, marginTop: 4, fontWeight: '600' , fontSize: 12 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: {  fontWeight: '700', color: COLORS.muted , fontSize: 12 },
  blockBtn: { paddingHorizontal: 12, paddingVertical: 5,  minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  btnLock: { backgroundColor: '#FEE2E2' },
  btnUnlock: { backgroundColor: '#DCFCE7' },
  blockBtnText: {  fontWeight: '800' , fontSize: 12 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12,  color: COLORS.muted , fontSize: 14 },
});
