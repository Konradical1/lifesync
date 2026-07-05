import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import JournalHistoryScreen from '../screens/JournalHistoryScreen';
import WaterHistoryScreen from '../screens/WaterHistoryScreen';
import SleepEventScreen from '../screens/EventScreens/SleepEventScreen';
import FoodEventScreen from '../screens/EventScreens/FoodEventScreen';
import ExerciseEventScreen from '../screens/EventScreens/ExerciseEventScreen';
import MedsEventScreen from '../screens/EventScreens/MedsEventScreen';
import OtherEventScreen from '../screens/EventScreens/OtherEventScreen';

const Stack = createNativeStackNavigator();

// Event screens are registered here as well as in AddEventStack so that
// home-screen shortcuts push them onto this stack — swiping back then lands
// on Home instead of being trapped in the add-event tab.
export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, fullScreenGestureEnabled: true }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="JournalHistory" component={JournalHistoryScreen} />
      <Stack.Screen name="WaterHistory" component={WaterHistoryScreen} />
      <Stack.Screen name="SleepEvent" component={SleepEventScreen} />
      <Stack.Screen name="FoodEvent" component={FoodEventScreen} />
      <Stack.Screen name="ExerciseEvent" component={ExerciseEventScreen} />
      <Stack.Screen name="MedsEvent" component={MedsEventScreen} />
      <Stack.Screen name="OtherEvent" component={OtherEventScreen} />
    </Stack.Navigator>
  );
}
