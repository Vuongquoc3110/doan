import React,{useState} from 'react';
import { View,Text,TextInput,TouchableOpacity,ActivityIndicator } from 'react-native';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import COLORS from '../theme/colors';
export function VerifiedReviewForm({orderId,productId}:{orderId:number;productId:number}){
  const authenticated=useAuthStore(s=>s.isAuthenticated);
  const [rating,setRating]=useState(5),[comment,setComment]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[sent,setSent]=useState(false);
  if(!authenticated)return null;
  const submit=async()=>{
    if(busy)return;setBusy(true);
    try{await apiClient.post('/v1/me/reviews',{orderId,productId,rating,comment:comment.trim()});setSent(true);setMessage('Đã gửi đánh giá mua hàng xác thực, đang chờ duyệt.');}
    catch(e:any){setMessage(e.response?.data?.message||'Không gửi được đánh giá. Bạn có thể thử lại.');}
    finally{setBusy(false);}
  };
  return <View style={{paddingVertical:12,gap:8}}>
    <Text style={{fontWeight:'700',color:COLORS.purpleDark}}>Đánh giá sản phẩm đã mua</Text>
    {!sent&&<><View style={{flexDirection:'row'}}>{[1,2,3,4,5].map(n=><TouchableOpacity accessibilityRole="button" accessibilityLabel={`${n} sao`} accessibilityState={{selected:rating===n}} key={n} onPress={()=>setRating(n)} style={{minWidth:48,minHeight:48,justifyContent:'center',alignItems:'center'}}><Text style={{fontSize:22,color:n<=rating?'#a36b00':COLORS.muted}}>★</Text></TouchableOpacity>)}</View>
      <TextInput accessibilityLabel="Nhận xét sản phẩm đã mua" multiline value={comment} onChangeText={setComment} placeholder="Nhận xét từ 3 ký tự" style={{minHeight:72,padding:12,borderWidth:1,borderColor:COLORS.border,borderRadius:8}}/>
      <TouchableOpacity accessibilityRole="button" disabled={busy||comment.trim().length<3} onPress={submit} style={{minHeight:48,padding:12,backgroundColor:COLORS.purple,borderRadius:8,alignItems:'center'}}>{busy?<ActivityIndicator color="white"/>:<Text style={{color:'white'}}>Gửi đánh giá</Text>}</TouchableOpacity>
    </>}
    {!!message&&<Text accessibilityLiveRegion="polite">{message}</Text>}
  </View>;
}
