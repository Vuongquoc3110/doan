import React,{useState} from 'react';
import { View,Text,TouchableOpacity,ActivityIndicator,Platform } from 'react-native';
import * as Location from 'expo-location';
import apiClient from '../api/client';
import { formatVnd } from '../utils/format';
import COLORS from '../theme/colors';
export function DeliveryQuotePanel({storeId,address,name,phone,onQuote,onAddress}:{storeId:number;address:string;name:string;phone:string;onQuote:(quote:any)=>void;onAddress:(address:string)=>void}){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const quote=async(current:boolean)=>{
    setBusy(true);onQuote(null);
    try{
      if(!name.trim()||phone.trim().length<9)throw new Error('Điền tên và điện thoại người nhận trước khi báo phí.');
      if((await Location.requestForegroundPermissionsAsync()).status!=='granted')throw new Error('Cần quyền vị trí để định vị điểm giao.');
      let lat:number,lng:number,deliveryAddress=address.trim();
      if(current){
        const location=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});lat=location.coords.latitude;lng=location.coords.longitude;
        const [place]=await Location.reverseGeocodeAsync({latitude:lat,longitude:lng});
        deliveryAddress=place?[place.streetNumber,place.street,place.district,place.city,place.region,place.country].filter(Boolean).join(', '):'';
        if(deliveryAddress.length<10)throw new Error('Không tìm được địa chỉ tại vị trí hiện tại. Hãy điền địa chỉ và báo phí theo địa chỉ.');
        onAddress(deliveryAddress);
      }else{
        if(Platform.OS==='web')throw new Error('Trên web, dùng nút giao tới vị trí hiện tại. Báo phí theo địa chỉ hỗ trợ trên điện thoại.');
        if(deliveryAddress.length<10)throw new Error('Điền địa chỉ đầy đủ gồm số nhà, đường, quận và thành phố.');
        const [location]=await Location.geocodeAsync(deliveryAddress);
        if(!location)throw new Error('Không định vị được địa chỉ. Kiểm tra lại hoặc dùng vị trí hiện tại.');
        lat=location.latitude;lng=location.longitude;
      }
      const result=(await apiClient.post('/v1/delivery/quote',{storeId,address:deliveryAddress,lat,lng,receiverName:name.trim(),receiverPhone:phone.trim()})).data.data;
      onQuote({...result,address:deliveryAddress,storeId,expiresAt:Date.now()+result.expiresInSeconds*1000});
      setMessage(`Phí giao ${formatVnd(result.fee)} · ${result.distanceKm} km. Báo giá có hiệu lực 5 phút; kiểm tra địa chỉ trước khi đặt hàng.`);
    }catch(e:any){setMessage(e.response?.data?.message||e.message);}
    finally{setBusy(false);}
  };
  return <View style={{paddingVertical:12,gap:8}}>
    <Text style={{fontWeight:'700',color:COLORS.purpleDark}}>Báo phí giao hàng theo điểm đến</Text>
    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={()=>quote(false)} style={{minHeight:48,justifyContent:'center'}}><Text style={{color:COLORS.purple}}>Báo phí theo địa chỉ đã nhập</Text></TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={()=>quote(true)} style={{minHeight:48,justifyContent:'center'}}><Text style={{color:COLORS.purple}}>Giao tới vị trí hiện tại của tôi</Text></TouchableOpacity>
    {busy?<ActivityIndicator/>:<Text accessibilityLiveRegion="polite">{message}</Text>}
  </View>;
}
