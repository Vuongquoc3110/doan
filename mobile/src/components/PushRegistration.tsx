import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { storage } from '../utils/storage';
import apiClient from '../api/client';

export function PushRegistration(){
  const authenticated=useAuthStore(s=>s.isAuthenticated);
  const userId=useAuthStore(s=>s.user?.id);
  const router=useRouter();const client=useQueryClient();
  useEffect(()=>{
    if(!authenticated||Platform.OS==='web'||!Device.isDevice||Constants.executionEnvironment===ExecutionEnvironment.StoreClient)return;
    let active=true;
    const projectId=Constants.expoConfig?.extra?.eas?.projectId||Constants.easConfig?.projectId;
    if(!projectId)return;
    // Import only in a native build: Expo Go does not include the push modules.
    const Notifications: typeof import('expo-notifications') = require('expo-notifications');
    Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});
    (async()=>{
      if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('orders',{name:'Đơn hàng',importance:Notifications.AndroidImportance.HIGH});
      let permission=await Notifications.getPermissionsAsync();
      if(permission.status!=='granted')permission=await Notifications.requestPermissionsAsync();
      if(permission.status!=='granted'||!active)return;
      const token=(await Notifications.getExpoPushTokenAsync({projectId})).data;
      if(!active)return;
      await apiClient.post('/v1/me/push-devices',{token,platform:Platform.OS});
      await storage.setItem('@klever_push_token',token);
    })().catch(()=>{/* Registration can retry on the next authenticated session. */});
    const received=Notifications.addNotificationReceivedListener(()=>{client.invalidateQueries({queryKey:['my-orders']});client.invalidateQueries({queryKey:['order-detail']});});
    const tapped=Notifications.addNotificationResponseReceivedListener(response=>{
      if(response.notification.request.content.data?.batchId&&['staff','admin'].includes(useAuthStore.getState().user?.role||'')){router.push('/(staff)/inventory');return;}
      const id=Number(response.notification.request.content.data?.orderId);
      if(Number.isSafeInteger(id)&&id>0)router.push(`/(customer)/order/${id}`);
    });
    return()=>{active=false;received.remove();tapped.remove();};
  },[authenticated,userId]);
  return null;
}
