import { Tabs } from "expo-router";

// Native tab bar hidden: the PWA bottom bar and drawer are custom components (later stage).
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => null}>
      <Tabs.Screen name="trainings" />
      <Tabs.Screen name="exercises" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="plans" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
