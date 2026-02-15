import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EventTypeListScreen from '../screens/EventTypeListScreen';
import SleepEventScreen from '../screens/EventScreens/SleepEventScreen';
import FoodEventScreen from '../screens/EventScreens/FoodEventScreen';
import ExerciseEventScreen from '../screens/EventScreens/ExerciseEventScreen';
import MedsEventScreen from '../screens/EventScreens/MedsEventScreen';
import OtherEventScreen from '../screens/EventScreens/OtherEventScreen';

const Stack = createNativeStackNavigator();

export default function AddEventStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EventTypeList" component={EventTypeListScreen} />
      <Stack.Screen name="SleepEvent" component={SleepEventScreen} />
      <Stack.Screen name="FoodEvent" component={FoodEventScreen} />
      <Stack.Screen name="ExerciseEvent" component={ExerciseEventScreen} />
      <Stack.Screen name="MedsEvent" component={MedsEventScreen} />
      <Stack.Screen name="OtherEvent" component={OtherEventScreen} />
    </Stack.Navigator>
  );
}
