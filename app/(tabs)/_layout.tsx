import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { rem } from '../../utils/scaling';
import { colors, typography } from '../../constants/theme';

// Simple tab icon component
function TabIcon({ focused, label }: { focused: boolean; label: string }) {
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.iconText, focused && styles.iconTextFocused]}>
        {label[0]}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarIconStyle: styles.tabIcon,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Home" />,
        }}
      />
      <Tabs.Screen
        name="decks"
        options={{
          title: 'Decks',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Decks" />,
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'Games',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Games" />,
        }}
      />
      <Tabs.Screen
        name="rank"
        options={{
          title: 'Rank',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Rank" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surfaceContainerLow,
    borderTopWidth: 0,
    height: rem(14),
    paddingBottom: rem(2),
  },
  tabLabel: {
    ...typography.labelSm,
  },
  tabItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rem(1),
  },
  tabIcon: {
    marginBottom: rem(0.5),
  },
  iconContainer: {
    width: rem(5),
    height: rem(5),
    borderRadius: rem(2.5),
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rem(0.5),
  },
  iconText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    lineHeight: rem(5),
  },
  iconTextFocused: {
    color: colors.primary,
  },
});
