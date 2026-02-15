import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InsightsScreen from '../screens/InsightsScreen';

const Stack = createNativeStackNavigator();

export default function InsightsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Insights" component={InsightsScreen} />
    </Stack.Navigator>
  );
}
