import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import InsightsScreen from '../screens/InsightsScreen';
import JournalHistoryScreen from '../screens/JournalHistoryScreen';

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Insights" component={InsightsScreen} />
      <Stack.Screen name="JournalHistory" component={JournalHistoryScreen} />
    </Stack.Navigator>
  );
}
