import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Image, Platform, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { PLACEHOLDER_PRODUCT_IMAGE } from '../utils/media';

const SLIDES = [
  { photo: 'photo-1619566636858-adf3ef46400b', label: 'SẮC VỊ TỰ NHIÊN', alt: 'Giỏ trái cây tươi nhiều màu sắc' },
  { photo: 'photo-1610832958506-aa56368176cf', label: 'MỘT CHÚT TƯƠI LÀNH', alt: 'Bộ sưu tập trái cây cho mỗi ngày' },
  { photo: 'photo-1559181567-c3190ca9959b', label: 'NGỌT LÀNH THEO MÙA', alt: 'Trái cherry tươi theo mùa' },
];
const INTERVAL = 6500;
const DRIVER = Platform.OS !== 'web';

export default function AnimatedFruitBanner({ mobile }: { mobile: boolean }) {
  const [active, setActive] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [screenFocused, setScreenFocused] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [failed, setFailed] = useState<boolean[]>(SLIDES.map(() => false));
  const [ready, setReady] = useState<boolean[]>(SLIDES.map(() => false));
  const opacity = useRef(SLIDES.map((_, index) => new Animated.Value(index === 0 ? 1 : 0))).current;
  const scale = useRef(SLIDES.map(() => new Animated.Value(1))).current;
  const running = !reduceMotion && screenFocused && appActive;

  useFocusEffect(useCallback(() => { setScreenFocused(true); return () => setScreenFocused(false); }, []));
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const app = AppState.addEventListener('change', state => setAppActive(state === 'active'));
    return () => { mounted = false; motion.remove(); app.remove(); };
  }, []);

  useEffect(() => {
    if (reduceMotion) { opacity.forEach((value, index) => value.setValue(index === active ? 1 : 0)); return; }
    const transition = Animated.parallel(opacity.map((value, index) => Animated.timing(value, { toValue: index === active ? 1 : 0, duration: 1000, useNativeDriver: DRIVER })));
    transition.start(({ finished }) => { if (finished) scale.forEach((value, index) => { if (index !== active) value.setValue(1); }); });
    return () => transition.stop();
  }, [active, reduceMotion, opacity, scale]);

  // Resume smoothly when returning to the home screen.
  useEffect(() => {
    if (reduceMotion) { scale.forEach(value => value.setValue(1)); return; }
    if (!running) return;
    const zoom = Animated.timing(scale[active], { toValue: 1.065, duration: INTERVAL + 1100, useNativeDriver: DRIVER });
    zoom.start();
    return () => zoom.stop();
  }, [active, running, reduceMotion, scale]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setActive(current => ready[(current + 1) % SLIDES.length] ? (current + 1) % SLIDES.length : current), INTERVAL);
    return () => clearInterval(timer);
  }, [running, ready, active]);

  return <View style={[s.banner, mobile && s.mobile]}>
    {SLIDES.map((slide, index) => <Animated.View key={slide.photo} pointerEvents="none" accessibilityElementsHidden={index !== active} importantForAccessibility={index === active ? 'auto' : 'no-hide-descendants'} style={[StyleSheet.absoluteFill, { opacity: opacity[index] }]}><Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: scale[index] }] }]}><Image accessibilityLabel={slide.alt} source={{ uri: failed[index] ? PLACEHOLDER_PRODUCT_IMAGE : `https://images.unsplash.com/${slide.photo}?auto=format&fit=crop&w=1400&q=85` }} onLoad={() => setReady(previous => previous.map((value, i) => i === index ? true : value))} onError={() => { setFailed(previous => previous.map((value, i) => i === index ? true : value)); setReady(previous => previous.map((value, i) => i === index ? true : value)); }} style={s.image} resizeMode="cover"/></Animated.View></Animated.View>)}
    <View pointerEvents="none" style={s.shade}/>
    <View style={[s.footer, mobile && s.footerMobile]}>
      <View style={s.caption}><Text style={s.label}>{SLIDES[active].label}</Text><Text style={s.number}>BỘ SƯU TẬP / 0{active + 1}</Text></View>
    </View>
  </View>;
}
const s = StyleSheet.create({
  banner: { width: '50%', minHeight: 600, backgroundColor: '#d9d4bd', overflow: 'hidden', position: 'relative' }, mobile: { width: '100%', minHeight: 400 }, image: { width: '100%', height: '100%' },
  shade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 125, backgroundColor: '#0e261b45' }, footer: { position: 'absolute', bottom: 22, left: 28, right: 28 }, footerMobile: { left: 20, right: 20, bottom: 15 },
  caption: { borderTopWidth: 1, borderColor: '#ffffff70', paddingTop: 15, flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, label: { color: '#fff', fontSize: 10, letterSpacing: 1.1 }, number: { color: '#fff', fontSize: 9, letterSpacing: 0.8 },
});
