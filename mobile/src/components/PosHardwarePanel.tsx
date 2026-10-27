import {AppAlert as Alert} from '../utils/alert';
import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import apiClient from '../api/client';
import COLORS from '../theme/colors';

export function PosHardwarePanel({onVariant,orderId,onNewSale}:{onVariant:(variant:any)=>void;orderId?:number;onNewSale:()=>void}) {
  const [open,setOpen]=useState(false);
  const [permission,requestPermission]=useCameraPermissions();
  const [sku,setSku]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [printing,setPrinting]=useState(false);
  const [printAttempted,setPrintAttempted]=useState(false);
  const lock=useRef(false);
  const scan=async(value:string)=>{
    if(lock.current||!value.trim())return;lock.current=true;setBusy(true);
    try {
      const variant=(await apiClient.get('/v1/staff/pos/variants/by-sku/'+encodeURIComponent(value.trim()))).data.data;
      if(Number(variant.qty)<=0)throw new Error('SKU này đã hết hàng tại chi nhánh');
      onVariant(variant);setMessage(`Đã thêm ${variant.product_name} · ${variant.variant_label}`);setSku('');
    }catch(e:any){setMessage(e.response?.data?.message||e.message||'Không đọc được SKU');}
    finally{setBusy(false);}
  };
  const print=async(reprint:boolean)=>{
    if(printing)return;setPrinting(true);setPrintAttempted(true);
    try{await apiClient.post(`/v1/staff/pos/orders/${orderId}/print`,{reprint});Alert.alert('Đã gửi lệnh in','Kiểm tra hóa đơn tại máy in trước khi in lại.');}
    catch(e:any){Alert.alert('Chưa xác nhận được bản in',e.response?.data?.message||'Kiểm tra máy in và giấy in trước khi thử lại.');}
    finally{setPrinting(false);}
  };
  const confirmReprint=()=>Alert.alert('In lại hóa đơn','Chỉ in lại nếu đã kiểm tra máy in để tránh hai bản hóa đơn.',[{text:'Hủy',style:'cancel'},{text:'In lại',onPress:()=>print(true)}]);
  return <View style={s.card}>
    <Text style={s.title}>Công cụ tại quầy</Text>
    {!orderId?<TouchableOpacity accessibilityRole="button" style={s.button} onPress={()=>{lock.current=false;setMessage('');setOpen(true);}}><Text style={s.buttonText}>Quét mã vạch / Nhập SKU</Text></TouchableOpacity>:<>
      <Text selectable style={s.description}>Đơn #{orderId} · Khổ giấy 58/80mm theo máy in của chi nhánh</Text>
      <TouchableOpacity accessibilityRole="button" disabled={printing} style={s.button} onPress={()=>printAttempted?confirmReprint():print(false)}>{printing?<ActivityIndicator color="white"/>:<Text style={s.buttonText}>{printAttempted?'In lại hóa đơn':'In hóa đơn'}</Text>}</TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={s.secondary} onPress={()=>{setPrintAttempted(false);onNewSale();}}><Text style={s.title}>Bắt đầu đơn mới</Text></TouchableOpacity>
    </>}
    <Modal visible={open} animationType="slide" onRequestClose={()=>setOpen(false)}>
      <View style={s.modal}>
        <Text style={s.title}>Quét mã SKU trên nhãn sản phẩm</Text>
        <Text style={s.description}>Mỗi lần quét thêm một sản phẩm. Có thể nhập mã từ bàn phím hoặc máy quét USB.</Text>
        {permission?.granted?<CameraView style={s.camera} facing="back" barcodeScannerSettings={{barcodeTypes:['ean13','ean8','code128','code39','qr','upc_a','upc_e']}} onBarcodeScanned={busy||lock.current?undefined:({data})=>scan(data)}/>:<TouchableOpacity accessibilityRole="button" style={s.secondary} onPress={()=>requestPermission()}><Text style={s.title}>Cho phép dùng camera</Text></TouchableOpacity>}
        <TextInput accessibilityLabel="Mã SKU" autoCapitalize="none" autoCorrect={false} value={sku} onChangeText={setSku} placeholder="Nhập chính xác SKU" style={s.input} onSubmitEditing={()=>{lock.current=false;scan(sku);}}/>
        <TouchableOpacity accessibilityRole="button" disabled={busy} style={s.button} onPress={()=>{lock.current=false;scan(sku);}}><Text style={s.buttonText}>Thêm SKU</Text></TouchableOpacity>
        {busy?<ActivityIndicator/>:<Text accessibilityLiveRegion="polite" style={s.description}>{message}</Text>}
        <TouchableOpacity accessibilityRole="button" disabled={busy} style={s.secondary} onPress={()=>{lock.current=false;setMessage('Sẵn sàng quét mã tiếp theo');}}><Text style={s.title}>Quét tiếp</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={s.secondary} onPress={()=>setOpen(false)}><Text style={s.title}>Đóng máy quét</Text></TouchableOpacity>
      </View>
    </Modal>
  </View>;
}
const s=StyleSheet.create({card:{backgroundColor:'white',padding:16,borderRadius:12,marginBottom:12,gap:10},title:{fontSize:16,fontWeight:'700',color:COLORS.purpleDark},description:{fontSize:14,lineHeight:21,color:COLORS.muted},button:{backgroundColor:COLORS.purple,minHeight:48,borderRadius:8,padding:14,alignItems:'center'},buttonText:{color:'white',fontWeight:'700'},secondary:{minHeight:48,padding:12,alignItems:'center',justifyContent:'center'},modal:{flex:1,padding:24,paddingTop:48,gap:10,backgroundColor:'white'},camera:{height:240,borderRadius:12,overflow:'hidden'},input:{borderWidth:1,borderColor:COLORS.border,padding:12,minHeight:48,borderRadius:8}});
