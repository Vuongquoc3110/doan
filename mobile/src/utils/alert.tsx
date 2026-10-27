import React,{useEffect,useState} from 'react';
import {Alert as NativeAlert,Platform,Modal,View,Text,TouchableOpacity,ScrollView} from 'react-native';
import type {AlertButton,AlertOptions} from 'react-native';
type Entry={title:string;message?:string;buttons:AlertButton[];options?:AlertOptions};
const queue:Entry[]=[];let notify:()=>void=()=>{};
export const AppAlert={alert(title:string,message?:string,buttons?:AlertButton[],options?:AlertOptions){
  if(Platform.OS!=='web')return NativeAlert.alert(title,message,buttons,options);
  queue.push({title,message,buttons:buttons?.length?buttons:[{text:'Đóng'}],options});notify();
}};
export function AppAlertHost(){
  const [entry,setEntry]=useState<Entry|null>(queue[0]||null);
  useEffect(()=>{notify=()=>setEntry(queue[0]||null);notify();return()=>{notify=()=>{};};},[]);
  if(Platform.OS!=='web'||!entry)return null;
  const dismiss=(button?:AlertButton)=>{queue.shift();notify();button?.onPress?.();if(!button)entry.options?.onDismiss?.();};
  return <Modal visible transparent animationType="fade" onRequestClose={()=>{if(entry.options?.cancelable!==false)dismiss(entry.buttons.find(b=>b.style==='cancel'));}}><View style={{flex:1,backgroundColor:'#0008',justifyContent:'center',alignItems:'center',padding:24}}><View accessibilityViewIsModal style={{width:'100%',maxWidth:500,maxHeight:'85%',padding:24,borderRadius:14,backgroundColor:'white',gap:16}}><Text accessibilityRole="header" style={{fontSize:20,fontWeight:'800',color:'#183e32'}}>{entry.title}</Text><ScrollView>{!!entry.message&&<Text style={{fontSize:16,lineHeight:24,color:'#25372b'}}>{entry.message}</Text>}</ScrollView>{entry.buttons.map((button,index)=><TouchableOpacity key={index} accessibilityRole="button" onPress={()=>dismiss(button)} style={{minHeight:48,padding:12,borderRadius:8,alignItems:'center',backgroundColor:button.style==='cancel'?'#f1f3ef':button.style==='destructive'?'#a62d34':'#183e32'}}><Text style={{fontWeight:'700',color:button.style==='cancel'?'#183e32':'white'}}>{button.text||'Đóng'}</Text></TouchableOpacity>)}</View></View></Modal>;
}
